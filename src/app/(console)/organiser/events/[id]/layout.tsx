import Link from "next/link";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { dateRange } from "@/lib/console";
import { requireOwnedEvent } from "@/lib/owner";

export default async function OwnerEventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, organiser } = await requireOwnedEvent(id);
  const base = `/organiser/events/${event.id}`;
  return (
    <div className="space-y-5">
      <Link href="/organiser" className="inline-flex min-h-11 items-center text-sm text-muted underline">
        All {organiser.name} events
      </Link>
      <div className="space-y-1">
        <h1 className="heading">{event.name}</h1>
        <p className="text-center text-sm text-muted">
          {dateRange(event.starts_on, event.ends_on)}
          {event.venue ? ` · ${event.venue}` : ""}
          {!event.is_active && !event.is_test ? " · hidden from athletes" : ""}
        </p>
      </div>
      <ConsoleNav
        label="Event sections"
        items={[
          { href: base, label: "Overview" },
          { href: `${base}/members`, label: "Racers" },
          { href: `${base}/swaps`, label: "Swaps" },
          { href: `${base}/settings`, label: "Settings" },
        ]}
      />
      {children}
    </div>
  );
}
