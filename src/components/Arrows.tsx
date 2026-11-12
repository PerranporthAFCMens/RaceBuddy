/**
 * The brand's two forward arrows: a white one ("You go") and a gold one
 * ("I go"). Pure decoration, so hidden from screen readers. Colours come from
 * tokens (fill-fg / fill-accent), and the thin cut between the arrows is the
 * page background, so it works in every organiser theme.
 */
export function Arrows({ className = "h-6 w-7" }: { className?: string }) {
  return (
    <svg viewBox="-20 -20 670 560" className={className} aria-hidden focusable="false">
      <polygon points="0,0 160,0 420,260 160,520 0,520 260,260" className="fill-fg" />
      <polygon
        points="210,0 370,0 630,260 370,520 210,520 470,260"
        className="fill-accent stroke-bg"
        strokeWidth={40}
        paintOrder="stroke"
      />
    </svg>
  );
}

/** Full-width white rule with the arrows in the middle. Splits big bands. */
export function ArrowDivider() {
  return (
    <div className="flex items-center gap-3 px-4" aria-hidden>
      <span className="h-px flex-1 bg-fg" />
      <Arrows className="h-6 w-7" />
      <span className="h-px flex-1 bg-fg" />
    </div>
  );
}
