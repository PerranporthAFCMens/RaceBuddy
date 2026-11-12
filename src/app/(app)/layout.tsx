import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { themeFromSetting } from "@/design/tokens";
import { getBadges } from "@/lib/badges";
import { getMyProfile, pickEvent, requireUser } from "@/lib/data";
import { TERMS_VERSION } from "@/lib/legal";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { acceptTerms } from "./me/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const supabase = await createClient();
  const [badges, { event }, { data: status }, profile] = await Promise.all([
    getBadges(supabase, user.id),
    pickEvent(undefined),
    supabase.from("account_status").select("status, message").eq("user_id", user.id).maybeSingle(),
    getMyProfile(),
  ]);
  const needsTerms = Boolean(profile && profile.terms_version !== TERMS_VERSION);
  const notice = accountNotice(status as { status: string; message: string | null } | null);
  // Athletes see the colour theme their race organiser chose (organisers.theme).
  const theme = themeFromSetting(event?.organiser?.theme);
  return (
    <div data-theme={theme} className="flex flex-1 flex-col bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-edge bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-4">
          <Logo href="/browse" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {notice && (
          <div role="status" className="mb-5 border border-danger p-3 text-sm">
            <p className="font-bold uppercase text-danger">{notice.title}</p>
            <p className="mt-1">{notice.text}</p>
          </div>
        )}
        {needsTerms && (
          <form action={acceptTerms} className="mb-5 space-y-3 border border-line bg-panel p-3 text-sm">
            <p>
              We&apos;ve updated our <Link href="/terms" className="underline">Terms of Use</Link>. Please read them and agree.
            </p>
            <SubmitButton pendingText="Saving…">I agree</SubmitButton>
          </form>
        )}
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNav userId={user.id} badges={badges} />
      </Suspense>
    </div>
  );
}

/** What a warned, suspended or banned person sees at the top of every screen. */
function accountNotice(row: { status: string; message: string | null } | null) {
  if (!row || row.status === "active") return null;
  const fallback = {
    warned: "We've had a report about your behaviour. Please follow the community rules, or your account may be suspended.",
    suspended: "You can still read your chats, but you can't message, send requests or change your listings while we review a report.",
    banned: "Your account has been closed for breaking the community rules.",
  }[row.status];
  if (!fallback) return null;
  const title = { warned: "Warning", suspended: "Account suspended", banned: "Account closed" }[row.status]!;
  return { title, text: row.message || fallback };
}
