import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

async function getBadges(userId: string) {
  const supabase = await createClient();
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

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const badges = await getBadges(user.id);
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-edge bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-4">
          <Logo href="/browse" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNav badges={badges} />
      </Suspense>
    </>
  );
}
