import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StateForm } from "@/components/console/StateForm";
import { brand } from "@/design/brand";
import { requireOwnedEvent, situationLabel, type OwnerMember } from "@/lib/owner";
import { hideMember, restoreMember } from "../../../actions";

export const metadata = { title: "Members" };

const FILTERS = [
  ["all", "Everyone"],
  ["looking", "Looking"],
  ["matched", "Matched"],
  ["paused", "Paused"],
  ["ticket", "With ticket"],
  ["no-ticket", "No ticket"],
  ["hidden", "Taken off"],
] as const;
type Filter = (typeof FILTERS)[number][0];

function keep(m: OwnerMember, f: Filter) {
  if (f === "hidden") return m.hidden;
  if (f === "all") return true;
  if (m.hidden) return false;
  if (f === "ticket") return m.has_ticket;
  if (f === "no-ticket") return !m.has_ticket;
  return m.status === f;
}

/** Everyone listed at the event, with the details athletes see when browsing. */
export default async function OwnerMembersPage({ params, searchParams }: PageProps<"/organiser/events/[id]/members">) {
  const { id } = await params;
  const { supabase, event } = await requireOwnedEvent(id);
  const sp = await searchParams;
  const filter: Filter = FILTERS.find(([f]) => f === sp.status)?.[0] ?? "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const { data } = await supabase.rpc("owner_members", { p_event: event.id });
  const all = (data as OwnerMember[] | null) ?? [];
  const members = all.filter((m) => keep(m, filter) && (!q || m.first_name.toLowerCase().includes(q.toLowerCase())));
  const base = `/organiser/events/${event.id}/members`;

  return (
    <div className="space-y-5">
      <form className="flex gap-2" role="search">
        <label className="sr-only" htmlFor="q">
          First name
        </label>
        <input id="q" className="input" name="q" defaultValue={q} placeholder="First name" />
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}
        <button className="btn-line shrink-0">Search</button>
      </form>
      <nav className="flex flex-wrap gap-2" aria-label="Filter members">
        {FILTERS.map(([f, label]) => (
          <Link key={f} href={f === "all" ? base : `${base}?status=${f}`} className={`chip min-h-11 ${f === filter ? "chip-on" : ""}`}>
            {label}
          </Link>
        ))}
      </nav>
      <p className="text-xs text-muted">
        {members.length} of {all.length}. You see what athletes see when browsing: never emails, dates of birth or chats.
      </p>
      {members.length === 0 ? (
        <p className="text-center text-sm text-muted">Nobody here.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.entry_id} className="card space-y-3 p-3">
              <div className="flex items-start gap-3">
                <Avatar name={m.first_name} path={m.photo_path} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold uppercase">
                    {m.first_name} <span className="font-normal text-muted">{m.age}</span>
                  </p>
                  <p className="text-sm">
                    {m.has_ticket ? (m.category_name ?? "Ticket") : "No ticket"} · {situationLabel(m.situation)}
                  </p>
                  <p className="text-xs text-muted">
                    Listed {new Date(m.listed_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}
                    {m.hidden && m.hidden_reason ? ` · taken off: ${m.hidden_reason}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={m.hidden ? "flag-gold" : m.status === "looking" ? "flag-ok" : "flag-line"}>
                    {m.hidden ? "Taken off" : m.status}
                  </span>
                  {m.ticket_verified && <span className="flag-line">Ticket checked</span>}
                </div>
              </div>
              {m.hidden ? (
                <StateForm action={restoreMember} submit="Put back on this event" buttonClass="btn-line w-full">
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                </StateForm>
              ) : (
                <details>
                  <summary className="min-h-11 cursor-pointer content-center text-sm text-muted underline">Take off this event</summary>
                  <StateForm action={hideMember} submit="Take off this event" buttonClass="btn-danger w-full" className="mt-2 space-y-3">
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <p className="text-xs text-muted">
                      They disappear from browse, matches and alerts for this event, and their open requests here close. They
                      aren&apos;t told. For a safety problem, contact {brand.name} instead.
                    </p>
                    <label className="block">
                      <span className="field-label">Reason (for your records, optional)</span>
                      <input className="input" name="reason" maxLength={280} />
                    </label>
                  </StateForm>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
