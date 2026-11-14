import { brand } from "@/design/brand";
import Link from "next/link";
import { StateForm } from "@/components/console/StateForm";
import { ThemeChoices } from "@/components/console/ThemeChoices";
import { themeFromSetting } from "@/design/tokens";
import { dateRange } from "@/lib/console";
import { requireOwner, type OwnerEvent } from "@/lib/owner";
import { setTheme } from "../actions";

export const metadata = { title: "Event console" };

/** Every organiser this person runs, with its events and colour theme. */
export default async function OrganiserHomePage() {
  const { supabase, organisers } = await requireOwner();
  const eventLists = await Promise.all(organisers.map((o) => supabase.rpc("owner_events", { p_org: o.id })));

  return (
    <div className="space-y-10">
      {organisers.map((o, i) => {
        const events = (eventLists[i].data as OwnerEvent[] | null) ?? [];
        return (
          <section key={o.id} className="space-y-4">
            <h1 className="heading">{o.name}</h1>
            {events.length === 0 ? (
              <p className="text-center text-sm text-muted">No events yet. {brand.name} adds new events for you.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/organiser/events/${e.id}`} className="card flex items-start justify-between gap-3 p-3 hover:border-fg">
                      <div className="min-w-0">
                        <p className="font-bold uppercase">{e.name}</p>
                        <p className="text-sm">{dateRange(e.starts_on, e.ends_on)}</p>
                        <p className="text-xs text-muted">
                          {e.listings} listings · {e.looking} looking · {e.locked_in} locked-in teams
                        </p>
                      </div>
                      <span className={e.is_test ? "flag-line" : e.is_active ? "flag-ok" : "flag-line"}>
                        {e.is_test ? "Test" : e.is_active ? "Live" : "Hidden"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <details className="card p-3">
              <summary className="min-h-11 cursor-pointer content-center font-bold uppercase">Colour theme</summary>
              <StateForm action={setTheme} submit="Save theme" buttonClass="btn-line w-full" className="mt-3 space-y-3">
                <input type="hidden" name="organiser_id" value={o.id} />
                <ThemeChoices current={themeFromSetting(o.theme)} />
              </StateForm>
            </details>
          </section>
        );
      })}
    </div>
  );
}
