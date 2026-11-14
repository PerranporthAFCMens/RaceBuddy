import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/data";

/**
 * Wider frame for the two consoles: the site admin console (/admin) and the
 * event owner console (/organiser). Each section checks its own role.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="flex flex-1 flex-col bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-edge bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4">
          <Logo href="/browse" />
          <Link href="/me" className="inline-flex min-h-11 items-center text-xs uppercase tracking-wide text-muted underline">
            Back to the app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-10">{children}</main>
    </div>
  );
}
