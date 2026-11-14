import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getMyProfile, requireUser } from "@/lib/data";

/**
 * Wider frame for the two consoles: the site admin console (/admin) and the
 * event owner console (/organiser). Each section checks its own role.
 * No racer profile is needed, so people without one get Sign out instead of
 * a link back into the app (which would ask them to make a profile).
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getMyProfile();
  return (
    <div className="flex flex-1 flex-col bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-edge bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4">
          <Logo href="/browse" />
          {profile ? (
            <Link href="/me" className="inline-flex min-h-11 items-center text-xs uppercase tracking-wide text-muted underline">
              Back to the app
            </Link>
          ) : (
            <form action="/auth/signout" method="post">
              <button className="inline-flex min-h-11 items-center text-xs uppercase tracking-wide text-muted underline">Sign out</button>
            </form>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-10">{children}</main>
    </div>
  );
}
