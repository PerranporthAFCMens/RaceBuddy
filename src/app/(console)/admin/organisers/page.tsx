import Link from "next/link";
import { OrganiserFields } from "@/components/console/OrganiserFields";
import { StateForm } from "@/components/console/StateForm";
import { requireAdmin, type AdminOrganiser } from "@/lib/admin";
import { saveOrganiser } from "../actions";

export const metadata = { title: "Organisers" };

export default async function AdminOrganisersPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_organisers");
  const organisers = (data as AdminOrganiser[] | null) ?? [];
  return (
    <div className="space-y-8">
      <h1 className="heading">Organisers</h1>
      <ul className="space-y-2">
        {organisers.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/organisers/${o.id}`} className="card flex items-start justify-between gap-3 p-3 hover:border-fg">
              <div className="min-w-0">
                <p className="font-bold uppercase">{o.name}</p>
                <p className="truncate text-sm">{o.owners.length ? o.owners.join(", ") : "No owner yet"}</p>
              </div>
              <span className="flag-line">
                {o.events} {o.events === 1 ? "event" : "events"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="space-y-3 border-t border-edge pt-6">
        <h2 className="font-bold uppercase">Add an organiser</h2>
        <StateForm action={saveOrganiser} submit="Add organiser" buttonClass="btn-line w-full">
          <OrganiserFields />
        </StateForm>
      </section>
    </div>
  );
}
