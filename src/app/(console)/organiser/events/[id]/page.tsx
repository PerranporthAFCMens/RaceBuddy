import { HeadlineTile } from "@/components/console/HeadlineTile";
import { StatTile } from "@/components/console/StatTile";
import { isAtRisk, requireOwnedEvent, type OwnerMember, type OwnerStats } from "@/lib/owner";

export const metadata = { title: "Event overview" };

/** Leads with the number organisers care about: teams at risk of dropping out. */
export default async function OwnerEventOverview({ params }: PageProps<"/organiser/events/[id]">) {
  const { id } = await params;
  const { supabase, event } = await requireOwnedEvent(id);
  const [{ data: statRows }, { data: memberRows }] = await Promise.all([
    supabase.rpc("owner_event_stats", { p_event: event.id }),
    supabase.rpc("owner_members", { p_event: event.id }),
  ]);
  const s = ((statRows as OwnerStats[] | null) ?? [])[0];
  const members = (memberRows as OwnerMember[] | null) ?? [];
  const atRisk = members.filter(isAtRisk).length;
  const noTicketLooking = members.filter((m) => !m.has_ticket && m.status === "looking" && !m.hidden).length;
  const base = `/organiser/events/${event.id}`;

  const more: [string, number | undefined, string?][] = [
    ["Looking now", s?.looking, `${base}/members?status=looking`],
    ["Matched", s?.matched, `${base}/members?status=matched`],
    ["With a ticket", s?.with_ticket],
    ["Ticket checked", s?.verified],
    ["No ticket", s?.without_ticket],
    ["Paused", s?.paused, `${base}/members?status=paused`],
    ["Taken off", s?.hidden, `${base}/members?status=hidden`],
  ];

  return (
    <div className="space-y-4">
      <HeadlineTile
        label="Teams at risk"
        value={atRisk}
        note="Ticket holders whose partner or teammate dropped out and who haven't found a replacement yet."
        href={`${base}/members`}
        action="See who"
      />
      <ul className="grid grid-cols-3 gap-2">
        <li>
          <StatTile label="Swaps done" value={s?.locked_in} href={`${base}/swaps`} />
        </li>
        <li>
          <StatTile label="No ticket, looking" value={noTicketLooking} href={`${base}/members?status=no-ticket`} />
        </li>
        <li>
          <StatTile label="Racers signed up" value={s?.listings} href={`${base}/members?status=all`} />
        </li>
      </ul>
      <details className="card p-3">
        <summary className="min-h-11 cursor-pointer content-center font-bold uppercase">More numbers</summary>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {more.map(([label, value, href]) => (
            <li key={label}>
              <StatTile label={label} value={value} href={href} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
