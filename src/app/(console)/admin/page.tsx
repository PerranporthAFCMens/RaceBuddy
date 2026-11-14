import Link from "next/link";
import { StatTile } from "@/components/console/StatTile";
import { requireAdmin, type AdminOverview } from "@/lib/admin";

export const metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_overview");
  const o = ((data as AdminOverview[] | null) ?? [])[0];

  const tiles: [string, number | undefined, string?][] = [
    ["Open reports", o?.open_reports, "/admin/reports"],
    ["People", o?.people, "/admin/people"],
    ["Listings", o?.listings],
    ["Looking now", o?.looking],
    ["Locked-in teams", o?.locked_in],
    ["Events", o?.events],
    ["Organisers", o?.organisers],
    ["Suspended", o?.suspended, "/admin/people?status=suspended"],
    ["Banned", o?.banned, "/admin/people?status=banned"],
  ];

  return (
    <div className="space-y-6">
      <h1 className="heading">Overview</h1>
      {(o?.urgent_reports ?? 0) > 0 && (
        <Link href="/admin/reports" role="status" className="block border border-danger p-3 text-sm">
          <span className="font-bold uppercase text-danger">{o!.urgent_reports} urgent</span> Threats and suspected
          under-18s: review today. If someone is in danger, call 999.
        </Link>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([label, value, href]) => (
          <li key={label}>
            <StatTile label={label} value={value} href={href} />
          </li>
        ))}
      </ul>
    </div>
  );
}
