import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { requireProfile } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AthleteProfile, Message } from "@/lib/types";

export const metadata = { title: "Chats" };

type Membership = {
  conversation_id: string;
  last_read_at: string;
  conversation: { id: string; kind: "pair" | "team"; last_message_at: string | null; created_at: string; event: { name: string } | null } | null;
};

export default async function ChatsPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, conversation:conversations(id, kind, last_message_at, created_at, event:events(name))")
    .eq("user_id", user.id);
  const memberships = ((data as unknown as Membership[]) ?? []).filter((m) => m.conversation);
  const ids = memberships.map((m) => m.conversation_id);

  const [{ data: members }, { data: recent }] = await Promise.all([
    ids.length
      ? supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids).neq("user_id", user.id)
      : { data: [] },
    ids.length
      ? supabase.from("messages").select("*").in("conversation_id", ids).order("created_at", { ascending: false }).limit(300)
      : { data: [] },
  ]);
  const otherIds = [...new Set(((members ?? []) as { user_id: string }[]).map((m) => m.user_id))];
  const { data: people } = otherIds.length
    ? await supabase.from("athlete_profiles").select("id, first_name, photo_path").in("id", otherIds)
    : { data: [] };
  const personById = new Map(((people ?? []) as Pick<AthleteProfile, "id" | "first_name" | "photo_path">[]).map((p) => [p.id, p]));
  const lastByConv = new Map<string, Message>();
  for (const m of (recent ?? []) as Message[]) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

  const rows = memberships
    .map((m) => {
      const others = ((members ?? []) as { conversation_id: string; user_id: string }[])
        .filter((x) => x.conversation_id === m.conversation_id)
        .map((x) => personById.get(x.user_id))
        .filter(Boolean) as Pick<AthleteProfile, "id" | "first_name" | "photo_path">[];
      const c = m.conversation!;
      const last = lastByConv.get(c.id);
      return {
        id: c.id,
        title: others.map((o) => o.first_name).join(", ") || "Just you so far",
        lead: others[0],
        kind: c.kind,
        event: c.event?.name,
        last,
        sortKey: c.last_message_at ?? c.created_at,
        unread: Boolean(c.last_message_at && c.last_message_at > m.last_read_at),
        hidden: c.kind === "pair" && others.length === 0,
      };
    })
    .filter((r) => !r.hidden)
    .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  return (
    <div className="space-y-5">
      <h1 className="heading">Chats</h1>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Chats open when someone accepts your request, or you accept theirs.{" "}
          <Link href="/browse" className="underline">Find a partner</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/chats/${r.id}`} className="card flex items-center gap-3 p-3 hover:border-fg">
                <Avatar name={r.lead?.first_name ?? "?"} path={r.lead?.photo_path ?? null} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold uppercase">
                    <span className="truncate">{r.title}</span>
                    {r.kind === "team" && <span className="flag-line">Team</span>}
                  </p>
                  <p className={`truncate text-sm ${r.unread ? "text-fg" : "text-muted"}`}>
                    {r.last ? `${r.last.sender_id === user.id ? "You: " : ""}${r.last.body}` : `New chat · ${r.event ?? ""}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted">
                  {r.last && timeAgo(r.last.created_at)}
                  {r.unread && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="Unread" />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
