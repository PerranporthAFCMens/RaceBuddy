import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, type AdminPerson, type AdminReport } from "@/lib/admin";
import { reportCategoryLabel } from "@/lib/safety";
import { EvidenceViewer, ModerateForm } from "./AdminForms";

export const metadata = { title: "Report" };

type LogRow = { id: string; action: string; note: string | null; created_at: string; report_id: string | null };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });

export default async function AdminReportPage({ params }: PageProps<"/admin/reports/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_reports", { p_filter: "all" });
  const report = ((data as AdminReport[] | null) ?? []).find((r) => r.id === id);
  if (!report) notFound();

  const [{ data: personRows }, { data: logRows }] = await Promise.all([
    report.reported_id ? supabase.rpc("admin_person", { p_user: report.reported_id }) : Promise.resolve({ data: [] }),
    supabase
      .from("moderation_actions")
      .select("id, action, note, created_at, report_id")
      .or(report.reported_id ? `report_id.eq.${id},user_id.eq.${report.reported_id}` : `report_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const person = ((personRows as AdminPerson[] | null) ?? [])[0];
  const log = (logRows as LogRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <Link href="/admin/reports" className="inline-flex min-h-11 items-center text-sm text-muted underline">
        Back to reports
      </Link>
      <section className="space-y-2">
        <h1 className="heading">{reportCategoryLabel(report.category)}</h1>
        <p className="text-center text-sm text-muted">
          {report.priority} · {report.status} · {when(report.created_at)}
        </p>
        <p className="border-l-2 border-accent pl-3 text-sm">{report.reason}</p>
        <p className="text-xs text-muted">Reported by {report.reporter_name ?? "a deleted account"}. They are never told the outcome.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold uppercase">Reported person</h2>
        {person ? (
          <dl className="text-sm">
            {[
              ["Name", person.first_name],
              ["Age", `${person.age} (born ${person.date_of_birth})`],
              ["Joined", when(person.joined)],
              ["Account", person.status],
              ["Reports about them", String(person.reports_against)],
              ["Blocked by", `${person.blocked_by} people`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-edge py-2">
                <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">This account has been deleted. You can still ban their email.</p>
        )}
        {report.category === "underage" && (
          <p className="text-xs text-muted">
            Suspected under 18: suspend while you check. Ask them to confirm their age; if they are under 18, ban.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold uppercase">Messages kept with the report</h2>
        <EvidenceViewer reportId={report.id} count={report.evidence_count} />
      </section>

      <section className="space-y-2">
        <h2 className="font-bold uppercase">Decision</h2>
        <ModerateForm reportId={report.id} canActOnPerson={Boolean(person)} />
      </section>

      <section className="space-y-2">
        <h2 className="font-bold uppercase">Log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted">No decisions yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {log.map((l) => (
              <li key={l.id} className="border-b border-edge pb-2">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {l.action} · {when(l.created_at)}
                  {l.report_id && l.report_id !== id ? " · other report" : ""}
                </p>
                {l.note && <p>{l.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
