import Link from "next/link";
import { StatTile } from "@/components/console/StatTile";
import { requireAdmin, type AdminEvent, type AdminOrganiser, type AdminOverview } from "@/lib/admin";

export const metadata = { title: "Today" };

type Todo = { text: string; href: string };

/**
 * The admin's start page: anything urgent first, then a short to-do list
 * (reports to review, events not ready), then the numbers.
 */
export default async function AdminTodayPage() {
  const { supabase } = await requireAdmin();
  const [{ data: overview }, { data: eventRows }, { data: orgRows }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_events"),
    supabase.rpc("admin_organisers"),
  ]);
  const o = ((overview as AdminOverview[] | null) ?? [])[0];
  const events = (eventRows as AdminEvent[] | null) ?? [];
  const organisers = (orgRows as AdminOrganiser[] | null) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => !e.is_test && e.ends_on >= today);

  const todo: Todo[] = [];
  if ((o?.open_reports ?? 0) > 0) {
    const n = o!.open_reports;
    todo.push({ text: `${n} open report${n === 1 ? "" : "s"} to review`, href: "/admin/reports" });
  }
  for (const e of upcoming.filter((e) => e.categories === 0)) {
    todo.push({ text: `${e.name}: add its categories`, href: `/admin/events/${e.id}` });
  }
  for (const e of upcoming.filter((e) => !e.is_active && e.categories > 0)) {
    todo.push({ text: `${e.name} is hidden from racers. Show it when it's ready`, href: `/admin/events/${e.id}` });
  }
  for (const org of organisers.filter((org) => org.owners.length === 0)) {
    todo.push({ text: `${org.name} has no one to run it. Add an owner`, href: `/admin/organisers/${org.id}` });
  }

  const tiles: [string, number | undefined, string?][] = [
    ["Racers", o?.people, "/admin/people"],
    ["Live events", upcoming.filter((e) => e.is_active).length, "/admin/events"],
    ["Organisers", o?.organisers, "/admin/organisers"],
  ];
  const more: [string, number | undefined, string?][] = [
    ["Listings", o?.listings],
    ["Looking now", o?.looking],
    ["Swaps done", o?.locked_in],
    ["All events", o?.events, "/admin/events"],
    ["Suspended", o?.suspended, "/admin/people?status=suspended"],
    ["Banned", o?.banned, "/admin/people?status=banned"],
  ];

  return (
    <div className="space-y-6">
      <h1 className="heading">Today</h1>
      {(o?.urgent_reports ?? 0) > 0 && (
        <Link href="/admin/reports" role="status" className="block border border-danger p-3 text-sm">
          <span className="font-bold uppercase text-danger">{o!.urgent_reports} urgent</span> Threats and suspected
          under-18s: review today. If someone is in danger, call 999.
        </Link>
      )}
      <section className="card p-3" aria-labelledby="todo">
        <h2 id="todo" className="field-label">To do</h2>
        {todo.length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting. Reports and event setup are all up to date.</p>
        ) : (
          <ul className="divide-y divide-edge">
            {todo.map((t) => (
              <li key={t.text}>
                <Link href={t.href} className="flex min-h-11 items-center justify-between gap-3 text-sm hover:text-accent">
                  <span>{t.text}</span>
                  <span aria-hidden className="text-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ul className="grid grid-cols-3 gap-2">
        {tiles.map(([label, value, href]) => (
          <li key={label}>
            <StatTile label={label} value={value} href={href} />
          </li>
        ))}
      </ul>
      <details className="card p-3">
        <summary className="min-h-11 cursor-pointer content-center font-bold uppercase">More numbers</summary>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {more.map(([label, value, href]) => (
            <li key={label}>
              <StatTile label={label} value={value} href={href} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
