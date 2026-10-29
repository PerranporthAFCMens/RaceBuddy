// Copies KeltX's upcoming events and adult race categories from Ticket
// Tailor into Supabase. Reads only event and ticket type data, no personal
// details. Safe to run again: it updates what is already there.
//
//   npm run sync:tickettailor
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
// TICKET_TAILOR_API_KEY in the environment (or .env.local).
import { createClient } from "@supabase/supabase-js";
import { parseTicketType } from "../src/lib/ticket-tailor/parse.ts";

const ORGANISER_SLUG = process.env.ORGANISER_SLUG ?? "keltx";

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. See .env.example.`);
    process.exit(1);
  }
  return v;
}

const ttKey = need("TICKET_TAILOR_API_KEY");
const supabase = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

type TTEvent = {
  id: string;
  name: string;
  url: string;
  start: { date: string };
  end: { date: string };
  venue?: { name?: string };
  status: string;
  ticket_types: { id: string; name: string }[];
};

async function tt<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.tickettailor.com/v1${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${ttKey}:`).toString("base64")}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Ticket Tailor ${path} returned ${res.status}`);
  return (await res.json()) as T;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const { data: organiser, error: orgErr } = await supabase
  .from("organisers")
  .select("id")
  .eq("slug", ORGANISER_SLUG)
  .single();
if (orgErr || !organiser) throw new Error(`Organiser "${ORGANISER_SLUG}" not found. Run supabase/seed.sql first.`);

const today = new Date().toISOString().slice(0, 10);
const list = await tt<{ data: TTEvent[] }>("/events?limit=100");
const upcoming = list.data.filter((e) => e.status === "published" && e.end.date >= today);

for (const summary of upcoming) {
  const ev = await tt<TTEvent>(`/events/${summary.id}`);
  const venue = ev.venue?.name ?? "";
  const town = /cornwall/i.test(venue)
    ? "Cornwall"
    : /exeter|westpoint/i.test(venue)
      ? "Exeter"
      : venue.split(/\s+/)[0] || "Event";
  const cutoff = new Date(`${ev.start.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const fields = {
    organiser_id: organiser.id,
    tt_event_id: ev.id,
    name: `KeltX ${town}`,
    venue: venue || null,
    starts_on: ev.start.date,
    ends_on: ev.end.date,
    ticket_url: ev.url,
    name_change_cutoff: cutoff.toISOString().slice(0, 10),
  };

  // Keep the slug of events we already have, so links don't break.
  const { data: existing } = await supabase.from("events").select("id").eq("tt_event_id", ev.id).maybeSingle();
  const { data: row, error } = existing
    ? await supabase.from("events").update(fields).eq("id", existing.id).select("id, slug").single()
    : await supabase
        .from("events")
        .insert({ ...fields, slug: slugify(`${ORGANISER_SLUG}-${town}-${ev.start.date.slice(0, 7)}`) })
        .select("id, slug")
        .single();
  if (error || !row) throw error ?? new Error("Event upsert failed");

  const categories = ev.ticket_types
    .map((t, i) => {
      const parsed = parseTicketType(t.name);
      return parsed ? { ...parsed, event_id: row.id, tt_ticket_type_id: t.id, sort_order: i } : null;
    })
    .filter((c) => c !== null);

  const { error: catErr } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "event_id,tt_ticket_type_id" });
  if (catErr) throw catErr;
  console.log(`${row.slug}: ${categories.length} categories`);
}
console.log(`Synced ${upcoming.length} upcoming event(s).`);
