import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TicketFlag } from "@/components/TicketFlag";
import { getCategories, getMyEntries, pickEvent, requireProfile } from "@/lib/data";
import { fitReasons, situationLabel } from "@/lib/matching";
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
  view?: string;
};

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v ? v : undefined;
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = await searchParams;
  const { user, profile } = await requireProfile();
  const { event, events } = await pickEvent(str(params.event));
  if (!event) return <p className="text-center text-muted">No races are open on Race Buddy yet. Check back soon.</p>;

  const f: Filters = {
    ticket: str(params.ticket),
    cat: str(params.cat),
    type: str(params.type),
    fivek: str(params.fivek),
    region: str(params.region),
    day: str(params.day),
    view: str(params.view),
  };

  const [categories, myEntries] = await Promise.all([getCategories(event.id), getMyEntries()]);
  const mine = myEntries.find((e) => e.event_id === event.id);
  const forYou = Boolean(mine) && f.view !== "all";
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

  let matchIds: string[] = [];
  if (mine) {
    const { data: ids } = await supabase.rpc("my_matches", { p_event: event.id });
    matchIds = ((ids as string[] | null) ?? []).filter(Boolean);
  }
  if (forYou) query = query.in("id", matchIds.length ? matchIds : ["00000000-0000-0000-0000-000000000000"]);

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
  const activeCount = [f.ticket, f.cat, f.type, f.fivek, f.region, f.day].filter(Boolean).length;
  const meSide = mine
    ? { ...mine, five_k_seconds: profile.five_k_seconds, region: profile.region }
    : null;
  const catName = (id: string) => {
    const c = catById.get(id);
    return c ? (c.race_day ? `${c.name} · ${c.race_day}` : c.name) : undefined;
  };

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

      {params.new === "1" && mine && (
        <p role="status" className="border border-ok px-3 py-2 text-sm text-ok">
          You&apos;re set up. {matchIds.length ? "Here's who fits what you're looking for." : "No one fits yet, so we'll email you when someone does."}
        </p>
      )}

      {mine && (
        <div className="grid grid-cols-2 border border-edge text-sm font-semibold uppercase tracking-wide" role="tablist" aria-label="Show">
          <Link
            href={link({ view: undefined })}
            role="tab"
            aria-selected={forYou}
            className={`grid min-h-11 place-items-center ${forYou ? "bg-fg text-bg" : "text-muted"}`}
          >
            For you · {matchIds.length}
          </Link>
          <Link
            href={link({ view: "all" })}
            role="tab"
            aria-selected={!forYou}
            className={`grid min-h-11 place-items-center ${!forYou ? "bg-fg text-bg" : "text-muted"}`}
          >
            Everyone
          </Link>
        </div>
      )}

      {mine && forYou && (
        <p className="flex items-center gap-2 border border-accent px-3 py-2 text-sm">
          <span className={`h-2 w-2 shrink-0 rounded-full ${mine.alerts_email ? "bg-accent" : "bg-edge"}`} aria-hidden />
          <span className="flex-1">
            {mine.alerts_email ? "Alerts on. We'll email you when a new match posts." : "Alerts off. Turn them on to hear about new matches."}
          </span>
          <Link href={`/me/race?event=${event.slug}#alerts`} className="text-accent underline">
            Change
          </Link>
        </p>
      )}

      {!mine && (
        <div className="border border-accent p-4 text-sm">
          <p className="mb-3">Tell us what you&apos;re looking for at {event.name}. We&apos;ll show who fits and email you when someone new does.</p>
          <Link href={`/me/race?event=${event.slug}`} className="btn-gold w-full">
            Set up my race
          </Link>
        </div>
      )}

      {!forYou && (
      <>
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
      </>
      )}

      {error && <p className="text-sm text-danger">Couldn&apos;t load athletes. Pull to refresh or try again.</p>}

      {athletes.length === 0 ? (
        forYou ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-muted">
              No one fits what you&apos;re looking for yet.
              {mine?.alerts_email ? " We'll email you as soon as someone does." : ""}
            </p>
            <div className="flex justify-center gap-2">
              <Link href={link({ view: "all" })} className="btn-line">
                See everyone
              </Link>
              <Link href={`/me/race?event=${event.slug}`} className="btn-ghost">
                Widen my criteria
              </Link>
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-muted">
            No one matches these filters. Try fewer, or check back soon as more athletes join.
          </p>
        )
      ) : (
        <ul className="space-y-3">
          {athletes.map((a) => (
            <li key={a.id}>
              <AthleteCard a={a} catById={catById} reasons={forYou && meSide ? fitReasons(meSide, a, catName) : null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AthleteCard({ a, catById, reasons }: { a: FeedEntry; catById: Map<string, Category>; reasons: string[] | null }) {
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
        <p className="text-sm text-accent">
          {situationLabel(a)}
          {isTeam && a.stations ? ` · ${a.stations}` : ""}
        </p>
        <p className="text-sm text-muted">{(reasons ?? meta).join(" · ")}</p>
        <div className="mt-1.5">
          <TicketFlag hasTicket={a.has_ticket} verified={a.ticket_verified} />
        </div>
      </div>
    </Link>
  );
}
