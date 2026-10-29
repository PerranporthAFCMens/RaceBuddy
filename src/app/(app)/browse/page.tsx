import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TicketFlag } from "@/components/TicketFlag";
import { getCategories, getMyEntries, pickEvent, requireProfile } from "@/lib/data";
import { categoryLabel, formatEventDates, formatRaceTime, REGIONS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Category, FeedEntry } from "@/lib/types";

export const metadata = { title: "Find your partner" };

const FIVE_K_OPTIONS = [20, 22, 25, 28, 30, 35];
const UUID = /^[0-9a-f-]{36}$/i;

type Filters = {
  ticket?: string;
  cat?: string;
  type?: string;
  fivek?: string;
  region?: string;
  day?: string;
};

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v ? v : undefined;
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = await searchParams;
  const { user } = await requireProfile();
  const { event, events } = await pickEvent(str(params.event));
  if (!event) return <p className="text-center text-muted">No races are open on Race Buddy yet. Check back soon.</p>;

  const f: Filters = {
    ticket: str(params.ticket),
    cat: str(params.cat),
    type: str(params.type),
    fivek: str(params.fivek),
    region: str(params.region),
    day: str(params.day),
  };

  const [categories, myEntries] = await Promise.all([getCategories(event.id), getMyEntries()]);
  const mine = myEntries.find((e) => e.event_id === event.id);
  const relayIds = categories.filter((c) => c.team_size === 4).map((c) => c.id);
  const days = [...new Set(categories.map((c) => c.race_day).filter(Boolean))] as string[];

  const supabase = await createClient();
  let query = supabase
    .from("feed_entries")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "looking")
    .neq("user_id", user.id)
    .order("ticket_verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (f.ticket === "has") query = query.eq("has_ticket", true);
  if (f.ticket === "none") query = query.eq("has_ticket", false);
  if (f.fivek && FIVE_K_OPTIONS.includes(Number(f.fivek))) query = query.lte("five_k_seconds", Number(f.fivek) * 60);
  if (f.region && (REGIONS as readonly string[]).includes(f.region)) query = query.eq("region", f.region);
  if (f.day && days.includes(f.day)) query = query.contains("race_days", [f.day]);

  const { data, error } = await query;
  // Category and race type match either the ticket's category or the
  // categories a no-ticket athlete would race, so they're filtered here.
  const relay = new Set(relayIds);
  const athletes = ((data as FeedEntry[] | null) ?? []).filter((a) => {
    const cats = a.category_id ? [a.category_id] : a.wanted_category_ids;
    if (f.cat && UUID.test(f.cat) && !cats.includes(f.cat)) return false;
    if (f.type === "teams" && !(a.has_ticket && a.category_id && relay.has(a.category_id))) return false;
    if (f.type === "relay" && !cats.some((c) => relay.has(c))) return false;
    if (f.type === "pairs" && !cats.some((c) => !relay.has(c))) return false;
    return true;
  });
  const catById = new Map(categories.map((c) => [c.id, c]));
  const activeCount = Object.values(f).filter(Boolean).length;

  const link = (patch: Partial<Filters>) => {
    const next = new URLSearchParams({ event: event.slug });
    for (const [k, v] of Object.entries({ ...f, ...patch })) if (v) next.set(k, v);
    return `/browse?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="heading">Find your partner</h1>

      {events.length > 1 && (
        <nav className="flex flex-wrap justify-center gap-2" aria-label="Races">
          {events.map((e) => (
            <Link key={e.id} href={`/browse?event=${e.slug}`} className={`chip ${e.id === event.id ? "chip-on" : ""}`}>
              {e.name}
            </Link>
          ))}
        </nav>
      )}
      <p className="text-center text-sm text-muted">
        {event.name} · {formatEventDates(event.starts_on, event.ends_on)}
      </p>

      {!mine && (
        <div className="border border-accent p-4 text-sm">
          <p className="mb-3">Add your listing for {event.name} so others can see you and you can send requests.</p>
          <Link href={`/me/race?event=${event.slug}`} className="btn-gold w-full">
            Add my listing
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Everyone", patch: { ticket: undefined } },
          { label: "Has ticket", patch: { ticket: "has" } },
          { label: "No ticket", patch: { ticket: "none" } },
        ].map((chip) => (
          <Link key={chip.label} href={link(chip.patch)} className={`chip ${f.ticket === chip.patch.ticket ? "chip-on" : ""}`}>
            {chip.label}
          </Link>
        ))}
        {relayIds.length > 0 && (
          <Link
            href={link({ type: f.type === "teams" ? undefined : "teams" })}
            className={`chip ${f.type === "teams" ? "chip-on" : ""}`}
          >
            Relay teams with a gap
          </Link>
        )}
      </div>

      <details className="border border-edge" open={activeCount > 1 || undefined}>
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold uppercase tracking-wide">
          More filters{activeCount ? ` (${activeCount})` : ""}
        </summary>
        <form className="grid gap-3 p-3 sm:grid-cols-2" action="/browse">
          <input type="hidden" name="event" value={event.slug} />
          {f.ticket && <input type="hidden" name="ticket" value={f.ticket} />}
          <label className="block">
            <span className="field-label">Category</span>
            <select className="input" name="cat" defaultValue={f.cat ?? ""}>
              <option value="">Any</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Race type</span>
            <select className="input" name="type" defaultValue={f.type ?? ""}>
              <option value="">Any</option>
              <option value="pairs">Doubles</option>
              <option value="relay">Relay (any)</option>
              <option value="teams">Relay teams with a gap</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">5km time</span>
            <select className="input" name="fivek" defaultValue={f.fivek ?? ""}>
              <option value="">Any</option>
              {FIVE_K_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Under {m}:00
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Area</span>
            <select className="input" name="region" defaultValue={f.region ?? ""}>
              <option value="">Anywhere</option>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          {days.length > 1 && (
            <label className="block">
              <span className="field-label">Race day</span>
              <select className="input" name="day" defaultValue={f.day ?? ""}>
                <option value="">Any</option>
                {days.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-gold flex-1">Apply</button>
            <Link href={`/browse?event=${event.slug}`} className="btn-line">
              Clear
            </Link>
          </div>
        </form>
      </details>

      {error && <p className="text-sm text-danger">Couldn&apos;t load athletes. Pull to refresh or try again.</p>}

      {athletes.length === 0 ? (
        <p className="py-10 text-center text-muted">
          No one matches yet. Try fewer filters, or check back soon as more athletes join.
        </p>
      ) : (
        <ul className="space-y-3">
          {athletes.map((a) => (
            <li key={a.id}>
              <AthleteCard a={a} catById={catById} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AthleteCard({ a, catById }: { a: FeedEntry; catById: Map<string, Category> }) {
  const isTeam = a.has_ticket && a.team_size === 4;
  const wants = a.wanted_category_ids.map((id) => catById.get(id)?.name).filter(Boolean) as string[];
  const uniqueWants = [...new Set(wants)];
  const meta = [
    a.has_ticket ? (a.category_name ? `${a.category_name}${a.race_day ? ` · ${a.race_day}` : ""}` : null) : uniqueWants.slice(0, 2).join(", ") + (uniqueWants.length > 2 ? ` +${uniqueWants.length - 2}` : ""),
    a.five_k_seconds ? `5km ${formatRaceTime(a.five_k_seconds)}` : null,
    a.home_town ?? a.region,
  ].filter(Boolean);

  return (
    <Link href={`/athletes/${a.id}`} className="card grid grid-cols-[56px_1fr] gap-3 p-3 hover:border-fg">
      <Avatar name={isTeam ? a.team_name || a.first_name : a.first_name} path={a.photo_path} size={56} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold uppercase">
          {isTeam ? `${a.team_name || `${a.first_name}'s team`} · Relay` : `${a.first_name}, ${a.age}`}
        </p>
        {isTeam && (
          <p className="text-sm text-accent">
            Needs {a.spots_needed} of 4{a.stations ? ` · ${a.stations}` : ""}
          </p>
        )}
        <p className="truncate text-sm text-muted">{meta.join(" · ")}</p>
        <div className="mt-1.5">
          <TicketFlag hasTicket={a.has_ticket} verified={a.ticket_verified} />
        </div>
      </div>
    </Link>
  );
}
