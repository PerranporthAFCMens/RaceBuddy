import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { AthleteProfile, Entry, FeedEntry, Lockin, Message } from "@/lib/types";
import { blockUser, reportUser } from "./actions";
import { Chat } from "./Chat";
import { LockinPanel, ReportForm, type LockinView } from "./LockinPanel";

export const metadata = { title: "Chat" };

type Conversation = {
  id: string;
  kind: "pair" | "team";
  team_entry_id: string | null;
  event: { id: string; name: string; ticket_url: string | null; name_change_cutoff: string | null } | null;
};

export default async function ChatPage({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: convData } = await supabase
    .from("conversations")
    .select("id, kind, team_entry_id, event:events(id, name, ticket_url, name_change_cutoff)")
    .eq("id", id)
    .maybeSingle();
  const conv = convData as unknown as Conversation | null;
  if (!conv?.event) notFound();

  const [{ data: memberRows }, { data: messageRows }, { data: lockinRows }, { data: myEntryRow }] = await Promise.all([
    supabase.from("conversation_members").select("user_id").eq("conversation_id", id),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(300),
    supabase.from("lockins").select("*").eq("conversation_id", id).order("created_at", { ascending: false }),
    supabase.from("entries").select("*").eq("user_id", user.id).eq("event_id", conv.event.id).maybeSingle(),
  ]);
  const otherIds = ((memberRows ?? []) as { user_id: string }[]).map((m) => m.user_id).filter((u) => u !== user.id);
  const [{ data: peopleRows }, { data: entryRows }] = await Promise.all([
    otherIds.length ? supabase.from("athlete_profiles").select("*").in("id", otherIds) : { data: [] },
    otherIds.length
      ? supabase.from("feed_entries").select("*").eq("event_id", conv.event.id).in("user_id", otherIds)
      : { data: [] },
  ]);
  const people = (peopleRows ?? []) as AthleteProfile[];
  const theirEntries = (entryRows ?? []) as FeedEntry[];
  const lockins = (lockinRows ?? []) as Lockin[];
  const myEntry = myEntryRow as Entry | null;
  const blockedSomeone = people.length < otherIds.length;

  const nameOf = (uid: string) => (uid === user.id ? "You" : (people.find((p) => p.id === uid)?.first_name ?? "Athlete"));
  const names = Object.fromEntries(people.map((p) => [p.id, p.first_name]));

  // Work out which lock-in card to show.
  let view: LockinView = { kind: "none", reason: "" };
  const proposedToMe = lockins.find((l) => l.status === "proposed" && l.partner_id === user.id);
  const proposedByMe = lockins.find((l) => l.status === "proposed" && l.proposer_id === user.id);
  const confirmed = lockins.filter((l) => l.status === "confirmed");
  const isCaptain = conv.kind === "team" && conv.team_entry_id === myEntry?.id;
  if (proposedToMe) {
    view = { kind: "confirm", lockinId: proposedToMe.id, proposerName: nameOf(proposedToMe.proposer_id) };
  } else if (proposedByMe) {
    view = { kind: "waiting", lockinId: proposedByMe.id, partnerName: nameOf(proposedByMe.partner_id) };
  } else if (conv.kind === "pair" && confirmed.length > 0) {
    const l = confirmed[0]!;
    view = {
      kind: "done",
      names: [nameOf(l.proposer_id), nameOf(l.partner_id)].sort((a, b) => Number(b === "You") - Number(a === "You")),
      cutoff: conv.event.name_change_cutoff,
      ticketUrl: conv.event.ticket_url,
      isHolder: l.proposer_id === user.id,
    };
  } else if (myEntry && people.length > 0 && !blockedSomeone) {
    const lockedIds = new Set(confirmed.map((l) => l.partner_id));
    const candidates = people.filter((p) => !lockedIds.has(p.id)).map((p) => ({ id: p.id, name: p.first_name }));
    const theirHasTicket = theirEntries.some((e) => e.has_ticket);
    const canPropose =
      conv.kind === "team"
        ? isCaptain && myEntry.status !== "matched"
        : myEntry.status !== "matched" && (myEntry.has_ticket || !theirHasTicket);
    if (canPropose && candidates.length) view = { kind: "propose", partners: candidates, isTeam: conv.kind === "team" };
  }

  const title = people.map((p) => p.first_name).join(", ") || "Chat";
  const lead = people[0];
  const leadEntry = lead ? theirEntries.find((e) => e.user_id === lead.id) : undefined;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 border-b border-edge pb-3">
        <Link href="/chats" className="text-sm text-muted" aria-label="Back to chats">
          ←
        </Link>
        {lead && <Avatar name={lead.first_name} path={lead.photo_path} size={40} />}
        <div className="min-w-0 flex-1">
          {leadEntry && conv.kind === "pair" ? (
            <Link href={`/athletes/${leadEntry.id}`} className="block truncate font-bold uppercase">
              {title}
            </Link>
          ) : (
            <p className="truncate font-bold uppercase">{title}</p>
          )}
          <p className="truncate text-xs text-muted">
            {conv.kind === "team" ? "Relay team chat · " : ""}
            {conv.event.name}
          </p>
        </div>
        {conv.kind === "team" && confirmed.length > 0 && (
          <span className="chip">{confirmed.length} locked in</span>
        )}
      </header>

      <LockinPanel conversationId={id} view={view} />

      <Chat
        conversationId={id}
        me={user.id}
        names={names}
        initial={(messageRows ?? []) as Message[]}
        canSend={!blockedSomeone && people.length > 0}
      />

      {people.length > 0 && (
        <details className="border-t border-edge pt-3 text-sm">
          <summary className="cursor-pointer text-muted">Block or report</summary>
          <div className="mt-3 space-y-4">
            <ReportForm
              conversationId={id}
              people={people.map((p) => ({ id: p.id, name: p.first_name }))}
              action={reportUser}
            />
            {people.map((p) => (
              <form key={p.id} action={blockUser}>
                <input type="hidden" name="user_id" value={p.id} />
                <SubmitButton className="btn w-full border border-danger text-danger" pendingText="Blocking…">
                  Block {p.first_name}
                </SubmitButton>
              </form>
            ))}
            <p className="text-xs text-muted">Blocked athletes can&apos;t see you or message you, and you won&apos;t see them.</p>
          </div>
        </details>
      )}
    </div>
  );
}
