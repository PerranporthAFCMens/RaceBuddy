import Link from "next/link";
import { getCategories, getMyEntries, pickEvent, requireProfile } from "@/lib/data";
import { isSituation } from "@/lib/matching";
import { formatEventDates } from "@/lib/format";
import { deleteEntry } from "./actions";
import { EntryForm } from "./EntryForm";

export const metadata = { title: "My race listing" };

export default async function RaceListingPage({ searchParams }: PageProps<"/me/race">) {
  const params = await searchParams;
  const { user, profile } = await requireProfile();
  const { event, events } = await pickEvent(typeof params.event === "string" ? params.event : undefined);
  if (!event) {
    return <p className="text-center text-muted">No races are open on Race Buddy yet. Check back soon.</p>;
  }
  const [categories, entries] = await Promise.all([getCategories(event.id), getMyEntries()]);
  const entry = entries.find((e) => e.event_id === event.id) ?? null;
  const welcome = params.welcome === "1";
  const situation = isSituation(params.situation) ? params.situation : null;

  return (
    <div className="space-y-6">
      <h1 className="heading">{entry ? "My race listing" : "Set up your race"}</h1>
      {events.length > 1 && (
        <nav className="flex flex-wrap justify-center gap-2" aria-label="Races">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/me/race?event=${e.slug}${welcome ? "&welcome=1" : ""}${situation ? `&situation=${situation}` : ""}`}
              className={`chip ${e.id === event.id ? "chip-on" : ""}`}
            >
              {e.name}
            </Link>
          ))}
        </nav>
      )}
      <div className="card p-4 text-center">
        <p className="font-bold uppercase">{event.name}</p>
        <p className="text-sm text-muted">
          {formatEventDates(event.starts_on, event.ends_on)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
      </div>
      {entry?.status === "matched" && (
        <p className="border border-ok p-3 text-sm text-ok">You&apos;re locked in for this race, so you don&apos;t show in the feed.</p>
      )}
      <EntryForm
        key={event.id}
        eventId={event.id}
        categories={categories}
        entry={entry}
        welcome={welcome}
        initialSituation={situation}
        myRegion={profile.region}
        myFiveK={profile.five_k_seconds}
        email={user.email}
      />
      {entry && (
        <form action={deleteEntry}>
          <input type="hidden" name="entry_id" value={entry.id} />
          <button className="btn-ghost w-full">Remove my listing for this race</button>
        </form>
      )}
    </div>
  );
}
