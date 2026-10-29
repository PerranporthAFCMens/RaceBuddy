import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { brand } from "@/design/brand";
import { getEvents, getUser } from "@/lib/data";
import { formatEventDates } from "@/lib/format";
import { SITUATIONS } from "@/lib/matching";

const STEPS = [
  ["Say what you're looking for", "A spare spot to fill, a spot on a team, or another single to enter with. Adults only."],
  ["Pick who you want", "Category, race day, 5km pace and where they train."],
  ["See your matches", "People who fit you come first, and we email you when a new one joins."],
  ["Partner up", "Send a request. Chat opens once they accept, so no spam."],
  ["Lock in", "The ticket holder locks in their new partner, and both show as Matched."],
];

export default async function Home() {
  if (await getUser()) redirect("/browse");
  const events = await getEvents();

  return (
    <main className="flex-1">
      <section className="border-b border-fg px-4 py-12 text-center">
        <Logo size="lg" href={null} />
        <p className="mt-4 text-xs uppercase tracking-brand text-muted">{brand.tagline}</p>
        <h1 className="mx-auto mt-8 max-w-xl font-display text-2xl uppercase sm:text-3xl">Lost your partner? Find a new one.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Doubles and relay racers who need a teammate, and athletes without a ticket who want in. Find each other,
          chat, and lock in your team before race day.
        </p>
        <div className="mx-auto mt-8 grid max-w-md gap-3 text-left">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">What are you looking for?</p>
          {SITUATIONS.map((s) => (
            <Link
              key={s.value}
              href={`/login?mode=signup&situation=${s.value}`}
              className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border border-edge p-3 hover:border-accent"
            >
              <span className="grid h-10 w-10 place-items-center border border-accent font-display text-xl text-accent" aria-hidden>
                {s.letter}
              </span>
              <span>
                <b className="block text-sm uppercase">{s.title}</b>
                <span className="text-sm text-muted">{s.sub}</span>
              </span>
              <span className="text-accent" aria-hidden>
                →
              </span>
            </Link>
          ))}
          <Link href="/login" className="btn-white mt-2">
            I have an account. Sign in
          </Link>
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
