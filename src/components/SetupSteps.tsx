const STEPS = ["Profile", "Looking for", "Who you want"];

/** Progress bar for first-time set-up: profile, then situation, then criteria. */
export function SetupSteps({ current }: { current: number }) {
  return (
    <div aria-label={`Step ${current} of ${STEPS.length}: ${STEPS[current - 1]}`} role="img" className="space-y-1.5">
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1 flex-1 ${i < current ? "bg-accent" : "bg-edge"}`} />
        ))}
      </div>
      <p className="text-xs uppercase tracking-wider text-muted">
        Step {current} of {STEPS.length} · {STEPS[current - 1]}
      </p>
    </div>
  );
}
