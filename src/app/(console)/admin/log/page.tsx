import { requireAdmin, ukTime, type ConsoleLogRow } from "@/lib/admin";

export const metadata = { title: "Console log" };

/** Every change made in either console, newest first. Moderation decisions are on each person and report. */
export default async function AdminLogPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_console_log");
  const rows = (data as ConsoleLogRow[] | null) ?? [];
  return (
    <div className="space-y-5">
      <h1 className="heading">Log</h1>
      <p className="text-sm text-muted">Changes to organisers, owners and events, by you and by event owners. Newest first.</p>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted">No changes yet.</p>
      ) : (
        <ol className="space-y-2 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="border-b border-edge pb-2">
              <p className="text-xs uppercase tracking-wide text-muted">
                {ukTime(r.created_at)} · {r.actor_email ?? "deleted account"}
              </p>
              <p>
                <span className="font-bold uppercase">{r.action}</span>
                {r.event_name ? ` · ${r.event_name}` : r.organiser_name ? ` · ${r.organiser_name}` : ""}
                {r.detail ? `: ${r.detail}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
