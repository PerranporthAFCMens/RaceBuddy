// Live check: runs the whole Race Buddy flow against the real Supabase
// project with throwaway users, then deletes everything it made.
//
//   npm run test:live
//
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY. Test users are created with the admin API, so no
// emails are sent.
import { createClient } from "@supabase/supabase-js";
import { supabaseBaseUrl } from "../src/lib/supabase/url.ts";

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const url = supabaseBaseUrl(need("NEXT_PUBLIC_SUPABASE_URL"));
const anonKey = need("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const admin = createClient(url, need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const run = `rbtest${Date.now().toString(36)}`;
const password = `Pw-${crypto.randomUUID()}`;
const userIds: string[] = [];
const conversationIds = new Set<string>();
const photoPaths: string[] = [];
let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

async function expectError(name: string, p: PromiseLike<{ error: { message: string } | null }>, needle: string) {
  const { error } = await p;
  check(name, Boolean(error && error.message.includes(needle)), error?.message ?? "no error");
}

async function makeUser(label: string) {
  const email = `${run}-${label}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
  userIds.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign in ${label}: ${signInError.message}`);
  return { id: data.user.id, client };
}

async function one<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data === null) throw new Error(`${what}: ${error?.message ?? "no data"}`);
  return data as NonNullable<T>;
}

async function main() {
  console.log(`Live check against ${new URL(url).host} (run ${run})`);

  // Starter data -------------------------------------------------------------
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  // Real races are only read. Everything this check creates goes on the test race.
  const keltx = await one(
    anon.from("events").select("id").eq("slug", "keltx-exeter-2027").single(),
    "load KeltX event",
  );
  const { data: keltxCats } = await anon.from("categories").select("id").eq("event_id", keltx.id);
  check("signed-out visitors see KeltX's 14 categories", keltxCats?.length === 14, keltxCats?.length);
  const event = await one(
    anon.from("events").select("id, is_active, is_test").eq("slug", "test-race").single(),
    "load test race (run supabase/migrations/20261030120000_test_race.sql first)",
  );
  check("the test race is marked as a test and not active", event.is_test === true && event.is_active === false, event);
  const { data: cats } = await anon.from("categories").select("id, tt_ticket_type_id, gender").eq("event_id", event.id);
  check("signed-out visitors see the test race's 2 categories", cats?.length === 2, cats?.length);
  const cat = (tt: string) => cats!.find((c) => c.tt_ticket_type_id === tt)!.id as string;
  await expectError("signed-out visitors cannot read the feed", anon.from("feed_entries").select("id"), "permission denied");
  await expectError("signed-out visitors cannot read profiles", anon.from("profiles").select("id"), "permission denied");

  // Sign-up and profiles -----------------------------------------------------
  console.log("Sign-up and profiles");
  const tom = await makeUser("tom");
  const jess = await makeUser("jess");
  const cara = await makeUser("cara");
  const dan = await makeUser("dan");
  const kid = await makeUser("kid");

  await expectError(
    "under-18s are refused",
    kid.client.from("profiles").insert({ id: kid.id, first_name: "Kid", date_of_birth: "2012-01-01" }),
    "adults only",
  );
  const { error: tomProfileError } = await tom.client
    .from("profiles")
    .insert({ id: tom.id, first_name: "Tom", date_of_birth: "1992-05-01", home_town: "Plymouth", five_k_seconds: 1310 });
  check("an adult can create their profile", !tomProfileError, tomProfileError?.message);
  await expectError(
    "nobody can create a profile for someone else",
    tom.client.from("profiles").insert({ id: jess.id, first_name: "Fake", date_of_birth: "1990-01-01" }),
    "row-level security",
  );

  // Profile photo: own folder only.
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ownPath = `${tom.id}/photo.png`;
  const { error: upErr } = await tom.client.storage.from("avatars").upload(ownPath, png, { contentType: "image/png" });
  if (!upErr) photoPaths.push(ownPath);
  check("athletes can upload their own photo", !upErr, upErr?.message);
  const { error: badUp } = await tom.client.storage
    .from("avatars")
    .upload(`${jess.id}/photo.png`, png, { contentType: "image/png" });
  if (!badUp) photoPaths.push(`${jess.id}/photo.png`);
  check("athletes cannot upload into someone else's photo folder", Boolean(badUp), "upload was allowed");

  // Tom: Saturday Mixed Doubles ticket, tries to verify himself.
  const tomEntry = await one(
    tom.client
      .from("entries")
      .insert({
        user_id: tom.id,
        event_id: event.id,
        has_ticket: true,
        category_id: cat("test_mixed_doubles"),
        ticket_verified: true,
        status: "matched",
        order_reference: `or_${run}`,
      })
      .select("id, ticket_verified, status")
      .single(),
    "tom entry",
  );
  check("self-verifying a ticket is ignored", !tomEntry.ticket_verified && tomEntry.status === "looking", tomEntry);
  await tom.client.from("entries").update({ ticket_verified: true, status: "matched" }).eq("id", tomEntry.id);
  const afterUpdate = await one(tom.client.from("entries").select("ticket_verified, status").eq("id", tomEntry.id).single(), "reload");
  check("self-verifying by editing is ignored", !afterUpdate.ticket_verified && afterUpdate.status === "looking", afterUpdate);

  const { error: verifyErr } = await admin
    .from("entries")
    .update({ ticket_verified: true, verified_at: new Date().toISOString() })
    .eq("id", tomEntry.id);
  const verified = await one(admin.from("entries").select("ticket_verified").eq("id", tomEntry.id).single(), "verified");
  check("the server can verify a ticket", !verifyErr && verified.ticket_verified, verifyErr?.message);

  await tom.client.from("entries").update({ order_reference: `or_${run}_x` }).eq("id", tomEntry.id);
  const cleared = await one(admin.from("entries").select("ticket_verified").eq("id", tomEntry.id).single(), "cleared");
  check("changing the order reference clears the badge", !cleared.ticket_verified);
  await admin.from("entries").update({ ticket_verified: true, order_reference: `or_${run}` }).eq("id", tomEntry.id);

  await one(
    jess.client
      .from("profiles")
      .insert({ id: jess.id, first_name: "Jess", date_of_birth: "1997-02-02", home_town: "Truro" })
      .select("id")
      .single(),
    "jess profile",
  );
  await one(
    jess.client
      .from("entries")
      .insert({
        user_id: jess.id,
        event_id: event.id,
        has_ticket: false,
        wanted_category_ids: cats!.filter((c) => c.gender === "mixed").map((c) => c.id),
      })
      .select("id")
      .single(),
    "jess entry",
  );
  // "Looking for" matching and alerts.
  const { data: tomSituation } = await tom.client.from("entries").select("situation").eq("id", tomEntry.id).single();
  check("a ticket holder's situation is spare spot", tomSituation?.situation === "spare_spot", tomSituation);
  const { data: jessMatches } = await jess.client.rpc("my_matches", { p_event: event.id });
  check("someone who needs a spot is matched with a spare spot", ((jessMatches as string[] | null) ?? []).includes(tomEntry.id), jessMatches);
  const { data: tomAlerts } = await tom.client.from("match_alerts").select("match_entry_id");
  check("the ticket holder gets an alert for the new match", (tomAlerts ?? []).length === 1, tomAlerts);
  const { data: jessAlerts } = await jess.client.from("match_alerts").select("id");
  check("athletes only see their own alerts", (jessAlerts ?? []).length === 0, jessAlerts);
  await expectError(
    "alerts cannot be written directly",
    jess.client.from("match_alerts").insert({ user_id: jess.id, for_entry_id: tomEntry.id, match_entry_id: tomEntry.id }),
    "permission denied",
  );

  const { data: jessProfiles } = await jess.client.from("profiles").select("id");
  check("athletes only read their own raw profile", jessProfiles?.length === 1, jessProfiles?.length);
  const { data: tomCard } = await jess.client.from("athlete_profiles").select("*").eq("id", tom.id).single();
  check("profile cards show age, not date of birth", Boolean(tomCard && tomCard.age >= 18 && !("date_of_birth" in tomCard)), tomCard);
  const { data: tomFeed } = await jess.client.from("feed_entries").select("*").eq("user_id", tom.id).single();
  check("the feed shows the verified badge", tomFeed?.ticket_verified === true, tomFeed);

  await one(cara.client.from("profiles").insert({ id: cara.id, first_name: "Cara", date_of_birth: "1988-03-03" }).select("id").single(), "cara profile");
  const caraEntry = await one(
    cara.client
      .from("entries")
      .insert({ user_id: cara.id, event_id: event.id, has_ticket: true, category_id: cat("test_mixed_relay"), team_name: `Team ${run}`, spots_needed: 2 })
      .select("id")
      .single(),
    "cara entry",
  );
  await one(dan.client.from("profiles").insert({ id: dan.id, first_name: "Dan", date_of_birth: "1990-04-04" }).select("id").single(), "dan profile");
  await one(dan.client.from("entries").insert({ user_id: dan.id, event_id: event.id, has_ticket: false }).select("id").single(), "dan entry");

  // Requests -----------------------------------------------------------------
  console.log("Requests");
  const { error: reqErr } = await jess.client.rpc("send_partner_request", { p_to_entry: tomEntry.id, p_note: "Free Saturday!" });
  check("an athlete can send a request", !reqErr, reqErr?.message);
  await expectError("a second request is refused", jess.client.rpc("send_partner_request", { p_to_entry: tomEntry.id, p_note: "again" }), "already sent");
  await expectError(
    "requests cannot be written directly",
    jess.client.from("partner_requests").insert({ event_id: event.id, from_user: jess.id, to_user: tom.id, to_entry_id: tomEntry.id }),
    "permission denied",
  );
  await expectError(
    "nobody can post into a chat they are not in",
    jess.client.from("messages").insert({ conversation_id: crypto.randomUUID(), sender_id: jess.id, body: "hi" }),
    "row-level security",
  );

  // Withdraw and resend works.
  const { data: dReq } = await dan.client.rpc("send_partner_request", { p_to_entry: tomEntry.id });
  const { error: wdErr } = await dan.client.rpc("withdraw_partner_request", { p_request: dReq });
  check("an athlete can withdraw a request", !wdErr, wdErr?.message);

  // Chat ---------------------------------------------------------------------
  console.log("Chat");
  const pending = await one(
    tom.client.from("partner_requests").select("id").eq("to_user", tom.id).eq("status", "pending").single(),
    "tom pending",
  );
  const { data: convId, error: accErr } = await tom.client.rpc("respond_to_partner_request", { p_request: pending.id, p_accept: true });
  check("accepting a request opens a chat", !accErr && Boolean(convId), accErr?.message);
  conversationIds.add(convId as string);
  const { data: members } = await tom.client.from("conversation_members").select("user_id").eq("conversation_id", convId);
  check("the chat has two members", members?.length === 2, members);

  // Live delivery: Jess listens, Tom sends.
  const received = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 15000);
    const channel = jess.client
      .channel(`live-${run}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, () => {
        clearTimeout(timer);
        void jess.client.removeChannel(channel);
        resolve(true);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await new Promise((r) => setTimeout(r, 2000));
          await tom.client.from("messages").insert({ conversation_id: convId, sender_id: tom.id, body: "Brilliant, want to train Thursday?" });
        }
      });
  });
  check("messages arrive live for the other athlete", await received);
  const { data: jessMsgs } = await jess.client.from("messages").select("body").eq("conversation_id", convId);
  check("both athletes read the chat", jessMsgs?.length === 1, jessMsgs);
  await expectError(
    "nobody can post as someone else",
    jess.client.from("messages").insert({ conversation_id: convId, sender_id: tom.id, body: "fake" }),
    "row-level security",
  );

  // Lock-in ------------------------------------------------------------------
  console.log("Lock-in");
  await expectError(
    "the athlete without a ticket cannot lock in the ticket holder",
    jess.client.rpc("propose_lockin", { p_conversation: convId, p_partner: tom.id, p_full_name: "Jess Example" }),
    "ticket holder locks in",
  );
  const { data: lockId, error: lockErr } = await tom.client.rpc("propose_lockin", {
    p_conversation: convId,
    p_partner: jess.id,
    p_full_name: "Tom Example",
  });
  check("the ticket holder can propose a lock-in", !lockErr, lockErr?.message);

  const { data: danMsgs } = await dan.client.from("messages").select("id");
  const { data: danConvs } = await dan.client.from("conversations").select("id");
  const { data: danLocks } = await dan.client.from("lockins").select("id");
  check("outsiders see no chats, messages or lock-ins", !danMsgs?.length && !danConvs?.length && !danLocks?.length);

  const { error: confirmErr } = await jess.client.rpc("respond_to_lockin", { p_lockin: lockId, p_accept: true, p_full_name: "Jess Example" });
  check("the partner can confirm the lock-in", !confirmErr, confirmErr?.message);
  const jessStatus = await one(jess.client.from("entries").select("status").eq("user_id", jess.id).single(), "jess status");
  const tomStatus = await one(jess.client.from("feed_entries").select("status").eq("user_id", tom.id).single(), "tom status");
  check("both listings show as matched", jessStatus.status === "matched" && tomStatus.status === "matched", { jessStatus, tomStatus });
  const { data: msgs3 } = await jess.client.from("messages").select("id").eq("conversation_id", convId);
  check("lock-in messages appear in the chat", msgs3?.length === 3, msgs3?.length);
  await expectError(
    "a matched athlete stops receiving requests",
    dan.client.rpc("send_partner_request", { p_to_entry: tomEntry.id }),
    "not looking",
  );

  // Relays -------------------------------------------------------------------
  console.log("Relays");
  const { error: relayReqErr } = await dan.client.rpc("send_partner_request", { p_to_entry: caraEntry.id });
  check("an athlete can ask to join a relay team", !relayReqErr, relayReqErr?.message);
  const relayReq = await one(
    cara.client.from("partner_requests").select("id").eq("to_user", cara.id).eq("status", "pending").single(),
    "relay req",
  );
  const { data: teamConv, error: teamErr } = await cara.client.rpc("respond_to_partner_request", { p_request: relayReq.id, p_accept: true });
  check("the captain accepting opens the team chat", !teamErr, teamErr?.message);
  conversationIds.add(teamConv as string);
  const teamRow = await one(cara.client.from("conversations").select("kind").eq("id", teamConv).single(), "team row");
  check("it is a team chat", teamRow.kind === "team", teamRow);
  await expectError(
    "only the captain can lock in relay athletes",
    dan.client.rpc("propose_lockin", { p_conversation: teamConv, p_partner: cara.id, p_full_name: "Dan Example" }),
    "team captain",
  );
  const { data: teamLock } = await cara.client.rpc("propose_lockin", { p_conversation: teamConv, p_partner: dan.id, p_full_name: "Cara Example" });
  const { error: teamConfirmErr } = await dan.client.rpc("respond_to_lockin", { p_lockin: teamLock, p_accept: true, p_full_name: "Dan Example" });
  check("a relay athlete can confirm", !teamConfirmErr, teamConfirmErr?.message);
  const teamStatus = await one(dan.client.from("feed_entries").select("status, spots_needed").eq("id", caraEntry.id).single(), "team status");
  check("the team keeps looking until every spot is filled", teamStatus.status === "looking", teamStatus);

  // Blocking -----------------------------------------------------------------
  console.log("Blocking and reports");
  const { error: blockErr } = await dan.client.from("blocks").insert({ blocker_id: dan.id, blocked_id: cara.id });
  check("an athlete can block someone", !blockErr, blockErr?.message);
  const { data: danSeesCara } = await dan.client.from("athlete_profiles").select("id").eq("id", cara.id);
  const { data: caraSeesDan } = await cara.client.from("athlete_profiles").select("id").eq("id", dan.id);
  check("blocked athletes are hidden both ways", danSeesCara?.length === 0 && caraSeesDan?.length === 0);
  await expectError(
    "a blocked athlete cannot post in a shared chat",
    dan.client.from("messages").insert({ conversation_id: teamConv, sender_id: dan.id, body: "hi" }),
    "row-level security",
  );
  await expectError(
    "nobody can block on someone else's behalf",
    jess.client.from("blocks").insert({ blocker_id: tom.id, blocked_id: dan.id }),
    "row-level security",
  );
  const { error: reportErr } = await dan.client.from("reports").insert({ reporter_id: dan.id, reported_id: cara.id, conversation_id: teamConv, reason: `live check ${run}` });
  check("an athlete can report someone", !reportErr, reportErr?.message);
  const { data: caraReports } = await cara.client.from("reports").select("id");
  check("the reported athlete cannot see the report", caraReports?.length === 0, caraReports);
}

async function cleanUp() {
  console.log("Cleaning up");
  if (photoPaths.length) await admin.storage.from("avatars").remove(photoPaths);
  if (conversationIds.size) await admin.from("conversations").delete().in("id", [...conversationIds]);
  // Deleting the users removes their profiles, listings, requests, chats
  // membership, messages, lock-ins, blocks and reports.
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.log(`  could not delete user ${id}: ${error.message}`);
  }
  const { count: left } = await admin.from("profiles").select("id", { count: "exact", head: true }).in("id", userIds.length ? userIds : [crypto.randomUUID()]);
  const { count: convLeft } = await admin
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .in("id", conversationIds.size ? [...conversationIds] : [crypto.randomUUID()]);
  console.log(`  leftover test profiles: ${left ?? "?"}, leftover chats: ${convLeft ?? "?"}`);
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

