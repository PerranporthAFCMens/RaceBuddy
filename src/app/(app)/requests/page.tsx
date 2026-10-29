import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { TicketFlag } from "@/components/TicketFlag";
import { requireProfile } from "@/lib/data";
import { categoryLabel, formatRaceTime, timeAgo } from "@/lib/format";
import { categoriesOf, situationLabel } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";
import type { AthleteProfile, FeedEntry, PartnerRequest } from "@/lib/types";
import { respondToRequest, withdrawRequest } from "./actions";

export const metadata = { title: "Requests" };

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const params = await searchParams;
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("partner_requests")
    .select("*")
    .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(100);
  const requests = (data as PartnerRequest[] | null) ?? [];

  const otherIds = [...new Set(requests.map((r) => (r.from_user === user.id ? r.to_user : r.from_user)))];
  const entryIds = [...new Set(requests.flatMap((r) => [r.from_entry_id, r.to_entry_id]).filter(Boolean))] as string[];
  const [{ data: people }, { data: entries }] = await Promise.all([
    otherIds.length ? supabase.from("athlete_profiles").select("*").in("id", otherIds) : { data: [] },
    entryIds.length ? supabase.from("feed_entries").select("*").in("id", entryIds) : { data: [] },
  ]);
  const personById = new Map(((people as AthleteProfile[]) ?? []).map((p) => [p.id, p]));
  const entryById = new Map(((entries as FeedEntry[]) ?? []).map((e) => [e.id, e]));

  // Hide requests involving people who are blocked (their profile isn't returned).
  const visible = requests.filter((r) => personById.has(r.from_user === user.id ? r.to_user : r.from_user));
  const incoming = visible.filter((r) => r.to_user === user.id && r.status === "pending");
  const outgoing = visible.filter((r) => r.from_user === user.id && r.status === "pending");
  const accepted = visible.filter((r) => r.status === "accepted").slice(0, 10);

  const eventIds = [...new Set(requests.map((r) => r.event_id))];
  const { data: catRows } = eventIds.length
    ? await supabase.from("categories").select("id, name, race_day").in("event_id", eventIds)
    : { data: [] };
  const catById = new Map(((catRows ?? []) as { id: string; name: string; race_day: string | null }[]).map((c) => [c.id, c]));
  const summary = (e: FeedEntry | undefined, p: AthleteProfile) => {
    const cats = e ? [...new Set(categoriesOf(e).map((id) => catById.get(id)).filter(Boolean).map((c) => categoryLabel(c!)))] : [];
    return [
      cats.slice(0, 2).join(", ") + (cats.length > 2 ? ` +${cats.length - 2}` : ""),
      p.five_k_seconds ? `5km ${formatRaceTime(p.five_k_seconds)}` : null,
      p.home_town ?? p.region,
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const sentAgo = (iso: string) => {
    const t = timeAgo(iso);
    return t === "just now" ? "Sent just now" : `Sent ${t} ago`;
  };

  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="space-y-8">
      <h1 className="heading">Requests</h1>
      {error && (
        <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section>
        <h2 className="field-label mb-3">Asking you ({incoming.length})</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted">No new requests. <Link href="/browse" className="underline">Browse athletes</Link> and make the first move.</p>
        ) : (
          <ul className="space-y-3">
            {incoming.map((r) => {
              const p = personById.get(r.from_user)!;
              const theirEntry = r.from_entry_id ? entryById.get(r.from_entry_id) : undefined;
              const myEntry = entryById.get(r.to_entry_id);
              return (
                <li key={r.id} className="card space-y-3 p-3">
                  <Link href={theirEntry ? `/athletes/${theirEntry.id}` : "#"} className="flex gap-3">
                    <Avatar name={p.first_name} path={p.photo_path} size={56} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold uppercase">
                        {p.first_name}, {p.age}
                        <span className="ml-2 font-normal normal-case text-muted">{timeAgo(r.created_at)}</span>
                      </p>
                      {myEntry?.team_name ? (
                        <p className="text-sm text-accent">Wants to join {myEntry.team_name}</p>
                      ) : (
                        theirEntry && <p className="text-sm text-accent">{situationLabel(theirEntry)}</p>
                      )}
                      <p className="text-sm text-muted">{summary(theirEntry, p)}</p>
                      {theirEntry && (
                        <div className="mt-1.5">
                          <TicketFlag hasTicket={theirEntry.has_ticket} verified={theirEntry.ticket_verified} />
                        </div>
                      )}
                    </div>
                  </Link>
                  {r.note && <p className="border-l-2 border-accent pl-3 text-sm">{r.note}</p>}
                  <form action={respondToRequest} className="grid grid-cols-2 gap-2">
                    <input type="hidden" name="request_id" value={r.id} />
                    <SubmitButton name="answer" value="accept" className="btn-gold" pendingText="…">
                      Accept and chat
                    </SubmitButton>
                    <SubmitButton name="answer" value="decline" className="btn-line" pendingText="…">
                      No thanks
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section>
          <h2 className="field-label mb-3">Waiting on ({outgoing.length})</h2>
          <ul className="space-y-2">
            {outgoing.map((r) => {
              const p = personById.get(r.to_user)!;
              return (
                <li key={r.id} className="card flex items-center gap-3 p-3">
                  <Avatar name={p.first_name} path={p.photo_path} size={40} />
                  <Link href={`/athletes/${r.to_entry_id}`} className="min-w-0 flex-1 text-sm font-bold uppercase">
                    {p.first_name}
                    <span className="ml-2 font-normal normal-case text-muted">{sentAgo(r.created_at)}</span>
                  </Link>
                  <form action={withdrawRequest}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <SubmitButton className="btn-ghost px-3 text-xs" pendingText="…">
                      Withdraw
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {accepted.length > 0 && (
        <section>
          <h2 className="field-label mb-3">Accepted</h2>
          <ul className="space-y-2">
            {accepted.map((r) => {
              const p = personById.get(r.from_user === user.id ? r.to_user : r.from_user)!;
              return (
                <li key={r.id}>
                  <Link href={`/chats/${r.conversation_id}`} className="card flex items-center gap-3 p-3 hover:border-fg">
                    <Avatar name={p.first_name} path={p.photo_path} size={40} />
                    <span className="flex-1 text-sm font-bold uppercase">{p.first_name}</span>
                    <span className="text-xs text-accent uppercase">Open chat</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
