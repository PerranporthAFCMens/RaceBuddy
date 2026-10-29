export function TicketFlag({ hasTicket, verified }: { hasTicket: boolean; verified?: boolean }) {
  const base =
    "inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[0.75rem] font-bold uppercase leading-none tracking-[0.08em]";
  if (!hasTicket) return <span className={`${base} border border-fg text-fg`}>No ticket</span>;
  return (
    <span className={`${base} bg-accent text-accent-ink`}>
      {verified && <span className="inline-block h-[7px] w-[7px] rounded-full bg-ok" aria-hidden />}
      {verified ? "Verified ticket" : "Has ticket"}
    </span>
  );
}

export function MatchedFlag() {
  return (
    <span className="inline-flex items-center whitespace-nowrap border border-ok px-2 py-1 text-[0.75rem] font-bold uppercase leading-none tracking-[0.08em] text-ok">
      Matched
    </span>
  );
}
