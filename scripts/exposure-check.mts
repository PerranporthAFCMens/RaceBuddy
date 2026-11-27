// Exposure check: acts like someone poking at the site with browser
// developer tools. The browser only ever holds the public (publishable) key,
// so this check uses only that key, signed out and as an ordinary signed-in
// athlete, and tries to read, add, change and delete in every table, call
// every database function, list stored photos and reach the admin login API.
//
//   npm run test:exposure
//
// Runs against the real Supabase project. Throwaway users only, deleted after.
// The secret key is used only to list the tables and to set up and clean up.
import { createClient } from "@supabase/supabase-js";
import { supabaseBaseUrl } from "../src/lib/supabase/url.ts";

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const url = supabaseBaseUrl(need("NEXT_PUBLIC_SUPABASE_URL"));
const anonKey = need("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// What a signed-out visitor may read: the race list. Nothing else.
const PUBLIC_READ = new Set(["organisers", "events", "categories"]);
// Tables a signed-in athlete may write to (row rules then limit it to their own rows).
const OWN_WRITE: Record<string, string[]> = {
  profiles: ["INSERT", "UPDATE"],
  entries: ["INSERT", "UPDATE", "DELETE"],
  blocks: ["INSERT", "DELETE"],
  reports: ["INSERT"],
  messages: ["INSERT"],
  message_reactions: ["INSERT", "DELETE"],
  conversation_members: ["UPDATE"], // last_read_at only
};
// Tables where a signed-in athlete may see other people's rows on purpose.
const SHARED_READ = new Set([
  "organisers", "events", "categories",
  "athlete_profiles", "feed_entries", // public cards: first name, age, town; never date of birth or email
  "entries", // race listings shown in the feed
]);

const run = `rbexp${Date.now().toString(36)}`;
const password = `Pw-${crypto.randomUUID()}`;
const userIds: string[] = [];
let passed = 0;
const failures: string[] = [];
const nowhere = "00000000-0000-0000-0000-000000000000";

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    if (process.env.VERBOSE) console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    const show = detail !== undefined && !process.env.CI;
    console.log(`  FAIL ${name}${show ? ` -> ${JSON.stringify(detail)}` : ""}`);
  }
}

async function makeUser(label: string) {
  const email = `${run}-${label}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
  userIds.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2 || !s.session) throw new Error(`sign in ${label}: ${e2?.message}`);
  return { id: data.user.id, token: s.session.access_token, client };
}

// Raw REST calls, exactly as DevTools would send them.
async function rest(path: string, token: string | null, init: RequestInit = {}) {
  const headers: Record<string, string> = { apikey: anonKey, "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${url}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body };
}
const denied = (r: { status: number; body: unknown }) =>
  r.status === 401 || r.status === 403 || (typeof r.body === "object" && r.body !== null && (r.body as { code?: string }).code === "42501");
// "cannot insert into view" (55000): the view can't take writes at all.
const rlsBlocked = (r: { status: number; body: unknown }) =>
  denied(r) || JSON.stringify(r.body).includes("row-level security") || JSON.stringify(r.body).includes('"55000"');

type OpenApi = { paths: Record<string, Record<string, { parameters?: { name: string; in: string; schema?: { format?: string; type?: string } }[] }>>; definitions: Record<string, { properties?: Record<string, { format?: string; type?: string }> }> };

function dummy(format?: string, type?: string): unknown {
  if (format === "uuid") return nowhere;
  if (format?.includes("int") || type === "integer" || type === "number") return 0;
  if (type === "boolean" || format === "boolean") return false;
  if (format === "jsonb" || format === "json") return {};
  if (format?.endsWith("[]")) return [];
  if (format === "date") return "2000-01-01";
  if (format?.startsWith("timestamp")) return "2000-01-01T00:00:00Z";
  return "x";
}

async function main() {
  console.log(`Exposure check against ${new URL(url).host} (run ${run})`);

  // 0. The table list itself must need the secret key.
  const doc = await rest("/rest/v1/", null);
  check("the list of tables needs the secret key", doc.status === 401 || doc.status === 403, doc.status);
  const api = (await (await fetch(`${url}/rest/v1/`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })).json()) as OpenApi;
  const tables = Object.keys(api.paths).filter((p) => p !== "/" && !p.startsWith("/rpc/")).map((p) => p.slice(1)).sort();
  const rpcs = Object.keys(api.paths).filter((p) => p.startsWith("/rpc/")).map((p) => p.slice(5)).sort();
  console.log(`  ${tables.length} tables and views, ${rpcs.length} functions`);

  // Victim: an ordinary athlete with a profile and a listing on the test race.
  const event = (await admin.from("events").select("id").eq("slug", "test-race").single()).data as { id: string };
  const cat = (await admin.from("categories").select("id").eq("event_id", event.id).limit(1).single()).data as { id: string };
  const victim = await makeUser("victim");
  await victim.client.from("profiles").insert({ id: victim.id, first_name: "Vic", date_of_birth: "1990-01-01", home_town: "Truro" });
  const { data: vEntry } = await victim.client
    .from("entries").insert({ user_id: victim.id, event_id: event.id, has_ticket: false, category_id: cat.id }).select("id").single();
  // Attacker: an ordinary signed-in athlete with a profile.
  const atk = await makeUser("atk");
  await atk.client.from("profiles").insert({ id: atk.id, first_name: "Ann", date_of_birth: "1991-01-01" });

  // 1. Every table: signed out, then signed in.
  console.log("Tables");
  for (const t of tables) {
    // A real column, and a filter that can never match, so a write that is
    // wrongly allowed still changes nothing.
    const cols = Object.entries(api.definitions[t]?.properties ?? {});
    const [col, colType] = cols[0] ?? ["id", {}];
    const never = `${col}=is.null&${col}=not.is.null`;
    const patch = JSON.stringify({ [col]: dummy(colType.format, colType.type) });
    // Signed out: read.
    const r = await rest(`/rest/v1/${t}?select=*&limit=5`, null);
    if (PUBLIC_READ.has(t)) check(`signed out can read ${t} (public race list)`, r.status === 200, r.status);
    else check(`signed out cannot read ${t}`, denied(r) || (Array.isArray(r.body) && r.body.length === 0), { status: r.status, rows: Array.isArray(r.body) ? r.body.length : r.body });

    // Signed out: add / change / delete. Nothing should even be allowed to try.
    const ins = await rest(`/rest/v1/${t}`, null, { method: "POST", body: "{}", headers: { Prefer: "return=minimal" } });
    check(`signed out cannot add to ${t}`, rlsBlocked(ins), ins);
    const up = await rest(`/rest/v1/${t}?${never}`, null, { method: "PATCH", body: patch });
    check(`signed out cannot change ${t}`, up.status >= 400, up);
    const del = await rest(`/rest/v1/${t}?${never}`, null, { method: "DELETE" });
    check(`signed out cannot delete from ${t}`, del.status >= 400, del);

    // Signed in: read. Outside the shared tables, only your own rows.
    const sr = await rest(`/rest/v1/${t}?select=*&limit=1000`, atk.token);
    const rows = Array.isArray(sr.body) ? (sr.body as Record<string, unknown>[]) : [];
    if (!SHARED_READ.has(t)) {
      const others = rows.filter((row) => !Object.values(row).includes(atk.id));
      check(`signed in sees only their own rows in ${t}`, denied(sr) || others.length === 0, { status: sr.status, othersRows: others.length });
    }
    if (t === "athlete_profiles" || t === "feed_entries") {
      const leaky = rows.some((row) => "date_of_birth" in row || "email" in row || "order_reference" in row);
      check(`${t} hides date of birth, email and order reference`, !leaky, Object.keys(rows[0] ?? {}));
    }
    if (t === "entries") {
      const leaky = rows.some((row) => row.user_id !== atk.id && row.order_reference);
      check("other people's ticket order references are hidden", !leaky);
    }

    // Signed in: write permissions match the allowed list.
    const allowed = OWN_WRITE[t] ?? [];
    if (!allowed.includes("INSERT")) {
      const i2 = await rest(`/rest/v1/${t}`, atk.token, { method: "POST", body: "{}", headers: { Prefer: "return=minimal" } });
      check(`signed in cannot add to ${t}`, rlsBlocked(i2), i2);
    }
    if (!allowed.includes("UPDATE")) {
      const u2 = await rest(`/rest/v1/${t}?${never}`, atk.token, { method: "PATCH", body: patch });
      check(`signed in cannot change ${t}`, u2.status >= 400, u2);
    }
    if (!allowed.includes("DELETE")) {
      const d2 = await rest(`/rest/v1/${t}?${never}`, atk.token, { method: "DELETE" });
      check(`signed in cannot delete from ${t}`, d2.status >= 400, d2);
    }
  }

  // 2. Someone else's rows: try to change and delete them.
  console.log("Someone else's data");
  await rest(`/rest/v1/profiles?id=eq.${victim.id}`, atk.token, { method: "PATCH", body: JSON.stringify({ first_name: "Hacked" }) });
  await rest(`/rest/v1/entries?id=eq.${vEntry?.id}`, atk.token, { method: "PATCH", body: JSON.stringify({ status: "matched", ticket_verified: true }) });
  await rest(`/rest/v1/entries?id=eq.${vEntry?.id}`, atk.token, { method: "DELETE" });
  await rest(`/rest/v1/profiles?id=eq.${victim.id}`, atk.token, { method: "DELETE" });
  const vp = (await admin.from("profiles").select("first_name").eq("id", victim.id).single()).data;
  const ve = (await admin.from("entries").select("status, ticket_verified").eq("id", vEntry?.id ?? nowhere).maybeSingle()).data;
  check("cannot change someone else's profile", vp?.first_name === "Vic", vp);
  check("cannot change or delete someone else's listing", ve?.status === "looking" && ve?.ticket_verified === false, ve);
  const fake = await rest(`/rest/v1/entries`, atk.token, { method: "POST", body: JSON.stringify({ user_id: victim.id, event_id: event.id, has_ticket: false, category_id: cat.id }) });
  check("cannot create a listing as someone else", rlsBlocked(fake), fake.status);
  const selfAdmin = await rest(`/rest/v1/admins`, atk.token, { method: "POST", body: JSON.stringify({ user_id: atk.id }) });
  check("cannot make yourself an admin", rlsBlocked(selfAdmin), selfAdmin.status);

  // 3. Functions. Signed out: none. Signed in: admin and organiser ones refuse.
  console.log("Functions");
  for (const f of rpcs) {
    const params = (api.paths[`/rpc/${f}`].post?.parameters ?? []).find((p) => p.in === "body");
    const props = (params?.schema as { properties?: Record<string, { format?: string; type?: string }> } | undefined)?.properties ?? {};
    const body = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, dummy(v.format, v.type)]));
    const a = await rest(`/rest/v1/rpc/${f}`, null, { method: "POST", body: JSON.stringify(body) });
    check(`signed out cannot call ${f}`, denied(a), a);
    if (/^(admin_|owner_|require_|moderate|purge_)/.test(f)) {
      const s = await rest(`/rest/v1/rpc/${f}`, atk.token, { method: "POST", body: JSON.stringify(body) });
      const empty = s.status === 200 && (s.body === null || (Array.isArray(s.body) && s.body.length === 0));
      check(`an ordinary athlete cannot use ${f}`, s.status >= 400 || empty, { status: s.status });
    }
  }

  // 4. Photos and the login system.
  console.log("Photos and logins");
  const list = await rest(`/storage/v1/object/list/avatars`, null, { method: "POST", body: JSON.stringify({ prefix: "", limit: 100 }) });
  check("signed out cannot list everyone's photos", list.status >= 400 || (Array.isArray(list.body) && list.body.length === 0), { status: list.status });
  const buckets = await rest(`/storage/v1/bucket`, null);
  check("signed out cannot list storage buckets", buckets.status >= 400 || (Array.isArray(buckets.body) && buckets.body.length === 0), buckets.status);
  const users = await rest(`/auth/v1/admin/users`, null);
  check("signed out cannot list user accounts", users.status === 401 || users.status === 403, users.status);
  const users2 = await rest(`/auth/v1/admin/users`, atk.token);
  check("signed in cannot list user accounts", users2.status === 401 || users2.status === 403, users2.status);
}

async function cleanUp() {
  console.log("Cleaning up");
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.log(`  could not delete a test user: ${error.message}`);
  }
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).in("id", userIds.length ? userIds : [nowhere]);
  console.log(`  leftover test profiles: ${count ?? "?"}`);
}

let crashed: unknown = null;
try {
  await main();
} catch (e) {
  crashed = e;
  console.log(`  CRASH ${(e as Error).message}`);
} finally {
  await cleanUp();
}
console.log(`\n${passed} passed, ${failures.length} failed${crashed ? ", stopped early" : ""}`);
process.exit(failures.length || crashed ? 1 : 0);
