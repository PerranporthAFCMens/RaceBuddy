export function TicketFlag({ hasTicket, verified }: { hasTicket: boolean; verified?: boolean }) {
  if (!hasTicket) return <span className="flag-line">No ticket</span>;
  return (
    <span className="flag-gold">
      {verified && <span className="inline-block size-2 rounded-full bg-accent-ink" aria-hidden />}
      {verified ? "Verified ticket" : "Has ticket"}
    </span>
  );
}

export function MatchedFlag() {
  return <span className="flag-ok">Matched</span>;
}
