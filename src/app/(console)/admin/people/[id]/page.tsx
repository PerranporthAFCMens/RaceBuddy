import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, ukTime, type AdminListing, type AdminPerson } from "@/lib/admin";
import { PersonForm } from "./PersonForm";

export const metadata = { title: "Person" };

type LogRow = { id: string; action: string; note: string | null; created_at: string; report_id: string | null };

export default async function AdminPersonPage({ params }: PageProps<"/admin/people/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: personRows }, { data: listingRows }, { data: logRows }] = await Promise.all([
    supabase.rpc("admin_person", { p_user: id }),
    supabase.rpc("admin_person_listings", { p_user: id }),
    supabase
      .from("moderation_actions")
      .select("id, action, note, created_at, report_id")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const person = ((personRows as AdminPerson[] | null) ?? [])[0];
  if (!person) notFound();
  const listings = (listingRows as AdminListing[] | null) ?? [];
  const log = (logRows as LogRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <Link href="/admin/people" className="inline-flex min-h-11 items-center text-sm text-muted underline">
        Back to people
      </Link>
      <section className="space-y-2">
        <h1 className="heading">{person.first_name}</h1>
        <dl className="text-sm">
          {[
            ["Age", `${person.age} (born ${person.date_of_birth})`],
            ["Joined", ukTime(person.joined)],
            ["Account", person.status],
            ["Message they see", person.status_message ?? "None"],
            ["Reports about them", String(person.reports_against)],
            ["Reports they made", String(person.reports_made)],
            ["Blocked by", `${person.blocked_by} people`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-edge py-2">
              <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold uppercase">Listings</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted">No race listings.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {listings.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 border-b border-edge py-2">
                <span>
                  {l.event_name}
                  <span className="text-muted"> · {l.has_ticket ? (l.category_name ?? "ticket") : "no ticket"}</span>
                </span>
                <span className="text-xs uppercase text-muted">
                  {l.status}
                  {l.hidden ? " · hidden by organiser" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold uppercase">Action</h2>
        <PersonForm userId={id} />
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
                  {l.action} · {ukTime(l.created_at)}
                  {l.report_id && (
                    <>
                      {" · "}
                      <Link href={`/admin/reports/${l.report_id}`} className="underline">
                        report
                      </Link>
                    </>
                  )}
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
