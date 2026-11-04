import type { SupabaseClient } from "@supabase/supabase-js";

export type Badges = Partial<Record<string, number>>;

/**
 * Counts for the bottom bar: requests waiting for an answer, and chats with
 * messages you haven't read. Works with the server or the browser client.
 */
export async function getBadges(supabase: SupabaseClient, userId: string): Promise<Badges> {
  const [{ count: requests }, { data: memberships }] = await Promise.all([
    supabase
      .from("partner_requests")
      .select("id", { count: "exact", head: true })
      .eq("to_user", userId)
      .eq("status", "pending"),
    supabase
      .from("conversation_members")
      .select("last_read_at, conversation:conversations(last_message_at)")
      .eq("user_id", userId),
  ]);
  const unread = ((memberships ?? []) as unknown as {
    last_read_at: string;
    conversation: { last_message_at: string | null } | null;
  }[]).filter((m) => m.conversation?.last_message_at && m.conversation.last_message_at > m.last_read_at).length;
  return { "/requests": requests ?? 0, "/chats": unread };
}
