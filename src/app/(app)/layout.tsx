import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { themeFromSetting } from "@/design/tokens";
import { getBadges } from "@/lib/badges";
import { pickEvent, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [badges, { event }] = await Promise.all([
    getBadges(await createClient(), user.id),
    pickEvent(undefined),
  ]);
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
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNav userId={user.id} badges={badges} />
      </Suspense>
    </div>
  );
}
