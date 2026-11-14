import Link from "next/link";
import { requireAdmin, type AdminPersonRow } from "@/lib/admin";

export const metadata = { title: "People" };

const STATUSES = ["active", "warned", "suspended", "banned"] as const;

export default async function AdminPeoplePage({ searchParams }: PageProps<"/admin/people">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const status = STATUSES.find((s) => s === params.status) ?? null;
  const { data } = await supabase.rpc("admin_people", { p_query: q, p_status: status });
  const people = (data as AdminPersonRow[] | null) ?? [];

  return (
    <div className="space-y-5">
      <h1 className="heading">People</h1>
      <form className="flex gap-2" role="search">
        <label className="sr-only" htmlFor="q">
          First name or email
        </label>
        <input id="q" className="input" name="q" defaultValue={q} placeholder="First name or email" />
        {status && <input type="hidden" name="status" value={status} />}
        <button className="btn-line shrink-0">Search</button>
      </form>
      <nav className="flex flex-wrap gap-2" aria-label="Filter by account">
        <Link href={`/admin/people${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={`chip min-h-11 ${!status ? "chip-on" : ""}`}>
          Everyone
        </Link>
        {STATUSES.filter((s) => s !== "active").map((s) => (
          <Link
            key={s}
            href={`/admin/people?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`chip min-h-11 ${status === s ? "chip-on" : ""}`}
          >
            {s}
          </Link>
        ))}
      </nav>
      {people.length === 0 ? (
        <p className="text-center text-sm text-muted">Nobody found.</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/people/${p.id}`} className="card flex items-start justify-between gap-3 p-3 hover:border-fg">
                <div className="min-w-0">
                  <p className="font-bold uppercase">
                    {p.first_name} <span className="font-normal text-muted">{p.age}</span>
                  </p>
                  <p className="truncate text-sm">{p.email}</p>
                  <p className="text-xs text-muted">
                    {p.listings} {p.listings === 1 ? "listing" : "listings"} · {p.reports_against} reports about them
                  </p>
                </div>
                <span className={p.status === "active" ? "flag-line" : "flag-gold"}>{p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {people.length === 100 && <p className="text-xs text-muted">Showing the newest 100. Search to narrow it down.</p>}
    </div>
  );
}
