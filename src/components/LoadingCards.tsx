/**
 * Placeholder cards shown the moment a tab is tapped, while the server
 * fetches the real screen. Shaped like the athlete cards so nothing jumps.
 */
export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading</span>
      <div className="h-6 w-2/5 animate-pulse bg-edge" aria-hidden />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex items-center gap-3 p-3" aria-hidden>
          <div className="h-14 w-14 shrink-0 animate-pulse bg-edge" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse bg-edge" />
            <div className="h-3.5 w-3/4 animate-pulse bg-edge" />
          </div>
        </div>
      ))}
    </div>
  );
}
