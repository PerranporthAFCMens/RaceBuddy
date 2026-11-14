import { StatTile } from "@/components/console/StatTile";
import { requireOwnedEvent, type OwnerStats } from "@/lib/owner";

export const metadata = { title: "Event overview" };

export default async function OwnerEventOverview({ params }: PageProps<"/organiser/events/[id]">) {
  const { id } = await params;
  const { supabase, event } = await requireOwnedEvent(id);
  const { data } = await supabase.rpc("owner_event_stats", { p_event: event.id });
  const s = ((data as OwnerStats[] | null) ?? [])[0];
  const base = `/organiser/events/${event.id}`;
  const tiles: [string, number | undefined, string?][] = [
    ["Listings", s?.listings, `${base}/members`],
    ["Looking now", s?.looking, `${base}/members?status=looking`],
    ["Matched", s?.matched, `${base}/members?status=matched`],
    ["Locked-in teams", s?.locked_in, `${base}/swaps`],
    ["With a ticket", s?.with_ticket],
    ["Ticket checked", s?.verified],
    ["No ticket", s?.without_ticket],
    ["Paused", s?.paused, `${base}/members?status=paused`],
    ["Taken off", s?.hidden, `${base}/members?status=hidden`],
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map(([label, value, href]) => (
        <li key={label}>
          <StatTile label={label} value={value} href={href} />
        </li>
      ))}
    </ul>
  );
}
