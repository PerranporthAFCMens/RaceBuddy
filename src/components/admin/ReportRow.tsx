import Link from "next/link";
import { reportCategoryLabel } from "@/lib/safety";
import { timeAgo } from "@/lib/format";

/** One report in the moderation list. */
export function ReportRow({
  report,
  now,
}: {
  report: {
    id: string;
    created_at: string;
    category: string;
    priority: string;
    status: string;
    reported_name: string | null;
    reporter_name: string | null;
    evidence_count: number;
  };
  now?: number;
}) {
  const flag = report.priority === "urgent" ? "flag-gold" : "flag-line";
  return (
    <Link href={`/admin/reports/${report.id}`} className="card flex items-start justify-between gap-3 p-3 hover:border-fg">
      <div className="min-w-0">
        <p className="font-bold uppercase">{report.reported_name ?? "Deleted account"}</p>
        <p className="text-sm">{reportCategoryLabel(report.category)}</p>
        <p className="text-xs text-muted">
          From {report.reporter_name ?? "a deleted account"} · {timeAgo(report.created_at, now)}
          {report.evidence_count > 0 ? ` · ${report.evidence_count} messages kept` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={flag}>{report.priority}</span>
        <span className="text-xs uppercase text-muted">{report.status}</span>
      </div>
    </Link>
  );
}
