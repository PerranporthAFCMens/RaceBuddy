import { requireUser } from "@/lib/data";

/**
 * Frame for the two consoles: the site admin console (/admin) and the
 * organiser view (/organiser). Each section adds the shared header with its
 * own area name and checks its own role. No racer profile is needed.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="flex flex-1 flex-col bg-bg text-fg">{children}</div>;
}
