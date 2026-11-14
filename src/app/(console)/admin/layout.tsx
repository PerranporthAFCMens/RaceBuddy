import { ConsoleNav } from "@/components/console/ConsoleNav";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/admin";
import { getRoles } from "@/lib/roles";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/organisers", label: "Organisers" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/log", label: "Log" },
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
