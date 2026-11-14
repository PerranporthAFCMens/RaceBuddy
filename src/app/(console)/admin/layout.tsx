import { ConsoleNav } from "@/components/console/ConsoleNav";
import { requireAdmin } from "@/lib/admin";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/log", label: "Log" },
];

/** Site admin console. Anyone who isn't an admin gets "not found". */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Site admin</p>
      <ConsoleNav label="Admin sections" items={ADMIN_TABS} />
      {children}
    </div>
  );
}
