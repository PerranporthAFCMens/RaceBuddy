import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { MatchedFlag, TicketFlag } from "@/components/TicketFlag";
import { brand } from "@/design/brand";
import { colors, fontSizes, type ColorToken } from "@/design/tokens";
import { isLive } from "@/lib/site-env";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

// Tailwind only builds classes it can see written out, so list them in full.
const SWATCH: Record<ColorToken, string> = {
  bg: "bg-bg",
  panel: "bg-panel",
  soft: "bg-soft",
  edge: "bg-edge",
  line: "bg-line",
  muted: "bg-muted",
  hint: "bg-hint",
  fg: "bg-fg",
  accent: "bg-accent",
  "accent-ink": "bg-accent-ink",
  ok: "bg-ok",
  danger: "bg-danger",
};

const SIZE: Record<keyof typeof fontSizes, string> = {
  "2xs": "text-2xs",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
};

/**
 * Every brand building block on one page. Developers check new work against
 * it, and the Playwright brand tests screenshot it. Hidden on the live site.
 */
export default function Styleguide() {
  if (isLive()) notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-12 px-4 py-10">
      <header className="space-y-3 text-center">
        <Logo size="lg" href={null} />
        <p className="text-xs uppercase tracking-brand text-muted">{brand.tagline}</p>
        <h1 className="heading">Styleguide</h1>
      </header>

      <section aria-labelledby="sg-colours" className="space-y-4">
        <h2 id="sg-colours" className="heading">Colours</h2>
        <ul className="grid grid-cols-3 gap-3">
          {(Object.keys(colors) as ColorToken[]).map((name) => (
            <li key={name} className="text-xs">
              <span className={`block h-12 border border-edge ${SWATCH[name]}`} />
              <span className="mt-1 block font-semibold uppercase tracking-wider">{name}</span>
              <span className="block text-muted">{colors[name]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sg-type" className="space-y-4">
        <h2 id="sg-type" className="heading">Type</h2>
        <ul className="space-y-3">
          {(Object.keys(SIZE) as (keyof typeof SIZE)[]).map((name) => (
            <li key={name} className="grid grid-cols-[3rem_1fr] items-baseline gap-3 border-t border-edge pt-3">
              <span className="text-xs text-muted">{name}</span>
              <span className={`${SIZE[name]} truncate uppercase`}>Find your partner</span>
            </li>
          ))}
        </ul>
        <p className="font-display text-4xl uppercase leading-none">Display · Mona Sans wide</p>
        <p className="text-base">
          Body copy is Open Sans at 16px. Keep sentences short and plain: say what happens next.
        </p>
      </section>

      <section aria-labelledby="sg-buttons" className="space-y-4">
        <h2 id="sg-buttons" className="heading">Buttons</h2>
        <div className="grid gap-3">
          <button type="button" className="btn-gold">Find your partner</button>
          <button type="button" className="btn-white">Sign in</button>
          <button type="button" className="btn-line">Back</button>
          <button type="button" className="btn-ghost">Skip for now</button>
          <button type="button" className="btn-danger">Block athlete</button>
          <button type="button" className="btn-gold" disabled>
            Saving…
          </button>
        </div>
      </section>

      <section aria-labelledby="sg-forms" className="space-y-4">
        <h2 id="sg-forms" className="heading">Forms</h2>
        <label className="block">
          <span className="field-label">Email</span>
          <input className="input" type="email" placeholder="you@example.com" />
        </label>
        <label className="block">
          <span className="field-label">Order reference</span>
          <input className="input" defaultValue="12" aria-invalid="true" aria-describedby="sg-error" />
          <span id="sg-error" className="mt-1 block text-xs text-danger">
            That doesn&apos;t look like an order reference.
          </span>
        </label>
        <label className="block">
          <span className="field-label">Region</span>
          <select className="input" defaultValue="South West">
            <option>South West</option>
            <option>London</option>
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-accent" defaultChecked />
          I am 18 or over
        </label>
        <div className="flex flex-wrap gap-2">
          <span className="chip">Mixed</span>
          <span className="chip chip-on">Female</span>
          <span className="chip">Relay</span>
        </div>
        <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
          That link has expired. Try again below.
        </p>
        <p role="status" className="border border-ok px-3 py-2 text-sm text-ok">
          Saved. You&apos;re in the feed.
        </p>
      </section>

      <section aria-labelledby="sg-flags" className="space-y-4">
        <h2 id="sg-flags" className="heading">Flags and badges</h2>
        <div className="flex flex-wrap items-center gap-2">
          <TicketFlag hasTicket verified />
          <TicketFlag hasTicket />
          <TicketFlag hasTicket={false} />
          <MatchedFlag />
          <span className="flag-line">Team</span>
          <span className="badge">3</span>
        </div>
      </section>

      <section aria-labelledby="sg-cards" className="space-y-4">
        <h2 id="sg-cards" className="heading">Cards</h2>
        <div className="card flex items-center gap-3 p-3">
          <Avatar name="Sam Taylor" path={null} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase">Sam, 29</p>
            <p className="truncate text-sm text-muted">Mixed Doubles · Saturday · 22:30 5km</p>
          </div>
          <TicketFlag hasTicket={false} />
        </div>
      </section>
    </main>
  );
}
