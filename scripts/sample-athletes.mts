// Sample athletes: 30 made-up people with listings on the Test Race, so the
// dev site shows what browsing and matches look like.
//
//   npm run samples:add      adds them (removes any old samples first)
//   npm run samples:remove   removes them all
//
// The live site never shows the Test Race, so they never appear there.
// Supabase doesn't let SQL create accounts, so this uses the admin API, like
// test:live. Accounts have no password and an example.com address, so nobody
// can sign in as them, and they never get match emails.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { supabaseBaseUrl } from "../src/lib/supabase/url.ts";

type Athlete = {
  first_name: string;
  age: number;
  region: string;
  home_town: string;
  travel_miles: number | null;
  gym: string | null;
  five_k_seconds: number;
  best_race_time: string | null;
  bio: string;
  situation: "spare_spot" | "need_spot" | "single";
  category: "d" | "r" | null;
  spots_needed: number;
  team_name: string | null;
  stations: string | null;
  note: string | null;
};

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const admin = createClient(supabaseBaseUrl(need("NEXT_PUBLIC_SUPABASE_URL")), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = /^sample-athlete-\d{2}@example\.com$/;
const athletes: Athlete[] = JSON.parse(readFileSync(new URL("../supabase/samples/athletes.json", import.meta.url), "utf8"));

async function sampleUserIds() {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      if (u.app_metadata?.sample === true && EMAIL.test(u.email ?? "")) ids.push(u.id);
    }
    if (data.users.length < 1000) return ids;
  }
}

async function remove() {
  const ids = await sampleUserIds();
  // Deleting the account removes the profile, listing, requests and chats.
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`deleteUser: ${error.message}`);
  }
  console.log(`Removed ${ids.length} sample athletes.`);
}

async function add() {
  await remove();
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, categories(id, tt_ticket_type_id)")
    .eq("slug", "test-race")
    .single();
  if (eventError || !event) throw new Error(`Test Race not found: ${eventError?.message}`);
  const cat = (tt: string) => {
    const c = event.categories.find((x: { tt_ticket_type_id: string }) => x.tt_ticket_type_id === tt);
    if (!c) throw new Error(`Test Race category ${tt} missing`);
    return c.id as string;
  };
  const doubles = cat("test_mixed_doubles");
  const relay = cat("test_mixed_relay");

  const entryIds: string[] = [];
  for (const [i, a] of athletes.entries()) {
    const n = i + 1;
    const { data, error } = await admin.auth.admin.createUser({
      email: `sample-athlete-${String(n).padStart(2, "0")}@example.com`,
      email_confirm: true,
      app_metadata: { sample: true },
    });
    if (error || !data.user) throw new Error(`createUser ${n}: ${error?.message}`);
    const id = data.user.id;

    // Birthdays spread through the year so ages look natural.
    const dob = new Date();
    dob.setUTCFullYear(dob.getUTCFullYear() - a.age);
    dob.setUTCDate(dob.getUTCDate() - (((n * 37) % 300) + 1));
    const { error: profileError } = await admin.from("profiles").insert({
      id,
      first_name: a.first_name,
      date_of_birth: dob.toISOString().slice(0, 10),
      bio: a.bio,
      gym: a.gym,
      home_town: a.home_town,
      region: a.region,
      travel_miles: a.travel_miles,
      five_k_seconds: a.five_k_seconds,
      best_race_time: a.best_race_time,
    });
    if (profileError) throw new Error(`profile ${n}: ${profileError.message}`);

    const hasTicket = a.situation === "spare_spot";
    const wanted = hasTicket ? [] : a.situation === "single" ? [doubles] : [[relay], [doubles, relay], [doubles]][n % 3];
    const { data: entry, error: entryError } = await admin
      .from("entries")
      .insert({
        user_id: id,
        event_id: event.id,
        has_ticket: hasTicket,
        category_id: a.category === "d" ? doubles : a.category === "r" ? relay : null,
        wanted_category_ids: wanted,
        team_name: a.team_name,
        spots_needed: a.spots_needed,
        stations: a.stations,
        race_days: hasTicket ? [] : ["Saturday"],
        note: a.note,
        situation: a.situation,
        partner_five_k_range: n % 4 === 0 ? 300 : null,
        alerts_email: false,
        created_at: new Date(Date.now() - n * 5 * 3600_000).toISOString(),
      })
      .select("id")
      .single();
    if (entryError || !entry) throw new Error(`listing ${n}: ${entryError?.message}`);
    entryIds.push(entry.id);
  }

  // New listings queue match emails for real people with a Test Race listing.
  // Mark those as sent so nobody is emailed about samples.
  const { error: alertError } = await admin
    .from("match_alerts")
    .update({ emailed_at: new Date().toISOString() })
    .is("emailed_at", null)
    .in("match_entry_id", entryIds);
  if (alertError) throw new Error(`match alerts: ${alertError.message}`);

  console.log(`Added ${entryIds.length} sample athletes to the Test Race.`);
}

const mode = process.argv[2];
if (mode === "add") await add();
else if (mode === "remove") await remove();
else {
  console.log("Usage: sample-athletes.mts add|remove");
  process.exit(1);
}
