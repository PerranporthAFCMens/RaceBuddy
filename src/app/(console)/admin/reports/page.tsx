import Link from "next/link";
import { ReportRow } from "@/components/admin/ReportRow";
import { ADMIN_FILTERS, requireAdmin, type AdminFilter, type AdminReport } from "@/lib/admin";

export const metadata = { title: "Reports" };

const LABELS: Record<AdminFilter, string> = { open: "Open", underage: "Under 18?", closed: "Closed" };

export default async function AdminPage({ searchParams }: PageProps<"/admin/reports">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const filter: AdminFilter = ADMIN_FILTERS.includes(params.show as AdminFilter) ? (params.show as AdminFilter) : "open";
  const { data } = await supabase.rpc("admin_reports", { p_filter: filter });
  const reports = (data as AdminReport[] | null) ?? [];
  const urgent = reports.filter((r) => r.priority === "urgent" && r.status !== "actioned" && r.status !== "dismissed").length;

  return (
    <div className="space-y-6">
      <h1 className="heading">Reports</h1>
      {urgent > 0 && (
        <p role="status" className="border border-danger p-3 text-sm">
          <span className="font-bold uppercase text-danger">{urgent} urgent</span> Threats and suspected under-18s: review
          today. If someone is in danger, call 999.
        </p>
      )}
      <nav className="flex gap-2" aria-label="Filter reports">
        {ADMIN_FILTERS.map((f) => (
          <Link key={f} href={`/admin/reports?show=${f}`} className={`chip min-h-11 ${f === filter ? "chip-on" : ""}`}>
            {LABELS[f]}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? (
        <p className="text-center text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <ReportRow report={r} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Opening message evidence needs a reason and is logged. Closed reports are deleted 12 months after closing.
      </p>
    </div>
  );
}
