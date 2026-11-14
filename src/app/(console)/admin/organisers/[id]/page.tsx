import Link from "next/link";
import { notFound } from "next/navigation";
import { OrganiserFields } from "@/components/console/OrganiserFields";
import { StateForm } from "@/components/console/StateForm";
import { ThemeChoices } from "@/components/console/ThemeChoices";
import { themeFromSetting } from "@/design/tokens";
import { requireAdmin, type AdminEvent, type AdminOrganiser } from "@/lib/admin";
import { dateRange } from "@/lib/console";
import { setTheme } from "../../../actions";
import { addOwner, removeOwner, saveOrganiser } from "../../actions";

export const metadata = { title: "Organiser" };

export default async function AdminOrganiserPage({ params }: PageProps<"/admin/organisers/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: orgRows }, { data: eventRows }] = await Promise.all([
    supabase.rpc("admin_organisers"),
    supabase.rpc("admin_events"),
  ]);
  const organiser = ((orgRows as AdminOrganiser[] | null) ?? []).find((o) => o.id === id);
  if (!organiser) notFound();
  const events = ((eventRows as AdminEvent[] | null) ?? []).filter((e) => e.organiser_id === id);

  return (
    <div className="space-y-8">
      <Link href="/admin/organisers" className="inline-flex min-h-11 items-center text-sm text-muted underline">
        Back to organisers
      </Link>
      <h1 className="heading">{organiser.name}</h1>

      <section className="space-y-3">
        <h2 className="font-bold uppercase">Owners</h2>
        <p className="text-sm text-muted">
          Owners run this organiser&apos;s events in the Event console. They need an account first: add them by the
          email they signed up with.
        </p>
        {organiser.owners.length === 0 ? (
          <p className="text-sm">No owner yet.</p>
        ) : (
          <ul className="space-y-2">
            {organiser.owners.map((email) => (
              <li key={email} className="flex items-center justify-between gap-3 border-b border-edge pb-2">
                <span className="min-w-0 truncate text-sm">{email}</span>
                <StateForm action={removeOwner} submit="Remove" pendingText="Removing…" className="flex shrink-0 items-center gap-2" buttonClass="btn-danger">
                  <input type="hidden" name="organiser_id" value={id} />
                  <input type="hidden" name="email" value={email} />
                </StateForm>
              </li>
            ))}
          </ul>
        )}
        <StateForm action={addOwner} submit="Add owner" buttonClass="btn-line w-full">
          <input type="hidden" name="organiser_id" value={id} />
          <label className="block">
            <span className="field-label">Owner&apos;s email</span>
            <input className="input" name="email" type="email" required autoComplete="off" />
          </label>
        </StateForm>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold uppercase">Events</h2>
        {events.length === 0 ? (
          <p className="text-sm">No events yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/events/${e.id}`} className="card flex items-start justify-between gap-3 p-3 hover:border-fg">
                  <span>
                    <span className="block font-bold uppercase">{e.name}</span>
                    <span className="block text-xs text-muted">{dateRange(e.starts_on, e.ends_on)}</span>
                  </span>
                  <span className={e.is_active ? "flag-ok" : "flag-line"}>{e.is_active ? "Shown" : "Hidden"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/admin/events/new?organiser=${id}`} className="btn-line w-full">
          Add an event
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold uppercase">Look</h2>
        <StateForm action={setTheme} submit="Save theme" buttonClass="btn-line w-full">
          <input type="hidden" name="organiser_id" value={id} />
          <ThemeChoices current={themeFromSetting(organiser.theme)} />
        </StateForm>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold uppercase">Details</h2>
        <StateForm action={saveOrganiser} submit="Save details">
          <OrganiserFields organiser={organiser} />
        </StateForm>
      </section>
    </div>
  );
}
