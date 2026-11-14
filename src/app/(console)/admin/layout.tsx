import { ConsoleNav } from "@/components/console/ConsoleNav";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/admin";
import { getRoles } from "@/lib/roles";

// Grouped by the admin's two jobs: keeping people safe, and setting up events.
const ADMIN_TABS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/reports", label: "Reports", group: "Safety" },
  { href: "/admin/people", label: "People", group: "Safety" },
  { href: "/admin/organisers", label: "Organisers", group: "Setup" },
  { href: "/admin/events", label: "Events", group: "Setup" },
  { href: "/admin/log", label: "Log", group: "Records" },
];

/** Site admin console. Anyone who isn't an admin gets the "Wrong account" page. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const roles = (await getRoles())!;
  return (
    <>
      <SiteHeader roles={roles} area="admin" wide />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-5 pb-10">
        <ConsoleNav label="Admin sections" items={ADMIN_TABS} />
        {children}
      </main>
    </>
  );
}
