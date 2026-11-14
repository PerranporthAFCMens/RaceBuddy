import Link from "next/link";
import { requireAdmin, type AdminEvent } from "@/lib/admin";
import { dateRange } from "@/lib/console";

export const metadata = { title: "Events" };

export default async function AdminEventsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_events");
  const events = (data as AdminEvent[] | null) ?? [];
  return (
    <div className="space-y-6">
      <h1 className="heading">Events</h1>
      <Link href="/admin/events/new" className="btn-line w-full">
        Add an event
      </Link>
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id}>
            <Link href={`/admin/events/${e.id}`} className="card flex items-start justify-between gap-3 p-3 hover:border-fg">
              <div className="min-w-0">
                <p className="font-bold uppercase">{e.name}</p>
                <p className="text-sm">
                  {e.organiser_name} · {dateRange(e.starts_on, e.ends_on)}
                </p>
                <p className="text-xs text-muted">
                  {e.listings} listings · {e.categories} categories
                </p>
              </div>
              <span className={e.is_test ? "flag-line" : e.is_active ? "flag-ok" : "flag-line"}>
                {e.is_test ? "Test" : e.is_active ? "Shown" : "Hidden"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
