import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { brand } from "@/design/brand";
import { TicketFlag } from "@/components/TicketFlag";
import { getEvents, getUser } from "@/lib/data";
import { formatEventDates } from "@/lib/format";

const STEPS = [
  ["Sign up", "Adults only. Tell us if you already have a ticket, or which categories you'd race."],
  ["Build your race profile", "Category, 5km or race time, gym, home town and the race day you can do."],
  ["Browse everyone", "Every athlete for the event, with and without tickets, plus relay teams with a gap."],
  ["Partner up", "Send a request. Chat opens once they accept, so no spam."],
  ["Lock in", "The ticket holder locks in their new partner, and both show as Matched."],
];

export default async function Home() {
  if (await getUser()) redirect("/browse");
  const events = await getEvents();

  return (
    <main className="flex-1">
      <section className="border-b border-fg px-4 py-16 text-center">
        <Logo size="lg" href={null} />
        <p className="mt-4 text-xs uppercase tracking-brand text-muted">{brand.tagline}</p>
        <h1 className="mx-auto mt-8 max-w-xl text-2xl uppercase sm:text-3xl">Lost your partner? Find a new one.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Doubles and relay racers who need a teammate, and athletes without a ticket who want in. Find each other,
          chat, and lock in your team before race day.
        </p>
        <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3">
          <Link href="/login?mode=signup" className="btn-gold">
            Find your partner
          </Link>
          <Link href="/login" className="btn-white">
            Sign in
          </Link>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          <TicketFlag hasTicket verified />
          <TicketFlag hasTicket={false} />
        </div>
      </section>

      {events.length > 0 && (
        <section className="border-b border-fg px-4 py-12">
          <h2 className="heading mb-6">Races on {brand.name}</h2>
          <ul className="mx-auto grid max-w-xl gap-3">
            {events.map((e) => (
              <li key={e.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold uppercase">{e.name}</p>
                  <p className="text-sm text-muted">
                    {formatEventDates(e.starts_on, e.ends_on)}
                    {e.venue ? ` · ${e.venue}` : ""}
                  </p>
                </div>
                {e.organiser?.website_url && (
                  <a href={e.organiser.website_url} className="text-sm text-accent underline" target="_blank" rel="noreferrer">
                    {e.organiser.name}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-4 py-12">
        <h2 className="heading mb-6">How it works</h2>
        <ol className="mx-auto max-w-xl">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[48px_1fr] gap-4 border-t border-edge py-4 last:border-b">
              <span className="font-display text-3xl leading-none text-accent">{i + 1}</span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="px-4 pb-10 text-center text-xs text-muted">
        {brand.name} is 18+ only. <Link href="/privacy" className="underline">Privacy</Link>
      </footer>
    </main>
  );
}
