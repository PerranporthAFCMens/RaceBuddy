import Link from "next/link";
import { notFound } from "next/navigation";
import { EventFields } from "@/components/console/EventFields";
import { StateForm } from "@/components/console/StateForm";
import { requireAdmin, type AdminEvent, type AdminOrganiser } from "@/lib/admin";
import type { Category } from "@/lib/types";
import { addCategory, removeCategory, saveEvent } from "../../actions";

export const metadata = { title: "Event" };

const DIVISIONS = ["doubles", "pro", "adaptive", "relay"];
const GENDERS = ["mixed", "female", "male"];

/** Add (/admin/events/new) or edit an event, and its categories. */
export default async function AdminEventPage({ params, searchParams }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: orgRows }, { data: eventRows }, { data: catRows }] = await Promise.all([
    supabase.rpc("admin_organisers"),
    isNew ? Promise.resolve({ data: [] }) : supabase.rpc("admin_events"),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("categories").select("*").eq("event_id", id).order("sort_order"),
  ]);
  const organisers = ((orgRows as AdminOrganiser[] | null) ?? []).map((o) => ({ id: o.id, name: o.name }));
  const event = isNew ? undefined : ((eventRows as AdminEvent[] | null) ?? []).find((e) => e.id === id);
  if (!isNew && !event) notFound();
  const categories = (catRows as Category[] | null) ?? [];
  const pre = (await searchParams).organiser;

  return (
    <div className="space-y-8">
      <Link href="/admin/events" className="inline-flex min-h-11 items-center text-sm text-muted underline">
        Back to events
      </Link>
      <h1 className="heading">{event?.name ?? "New event"}</h1>
      {event?.is_test && <p className="text-center text-sm text-muted">Test race: only shown on the dev site.</p>}

      <section className="space-y-3">
        <StateForm action={saveEvent} submit={isNew ? "Add event" : "Save event"}>
          {event && <input type="hidden" name="event_id" value={event.id} />}
          <EventFields
            event={event}
            admin={{
              organisers,
              organiserId: event?.organiser_id ?? (typeof pre === "string" ? pre : undefined),
              slug: event?.slug,
              isActive: event?.is_active,
            }}
          />
        </StateForm>
        {isNew && <p className="text-xs text-muted">New events start hidden from athletes. Add categories, then tick Show.</p>}
      </section>

      {event && (
        <section className="space-y-3">
          <h2 className="font-bold uppercase">Categories</h2>
          {categories.length === 0 ? (
            <p className="text-sm">None yet. Athletes with a ticket need a category to pick.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 border-b border-edge pb-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-muted">
                      {" "}
                      · {c.division} · {c.gender} · teams of {c.team_size}
                      {c.race_day ? ` · ${c.race_day}` : ""}
                    </span>
                  </span>
                  <StateForm action={removeCategory} submit="Remove" pendingText="Removing…" className="flex shrink-0 items-center gap-2" buttonClass="btn-danger">
                    <input type="hidden" name="category_id" value={c.id} />
                  </StateForm>
                </li>
              ))}
            </ul>
          )}
          <StateForm action={addCategory} submit="Add category" buttonClass="btn-line w-full">
            <input type="hidden" name="event_id" value={event.id} />
            <label className="block">
              <span className="field-label">Category name</span>
              <input className="input" name="name" required maxLength={60} placeholder="Mixed Doubles" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">Division</span>
                <select className="input" name="division" defaultValue="doubles">
                  {DIVISIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Gender</span>
                <select className="input" name="gender" defaultValue="mixed">
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Team size</span>
                <select className="input" name="team_size" defaultValue="2">
                  <option value="2">2 (pairs)</option>
                  <option value="4">4 (relay)</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">Race day (optional)</span>
                <input className="input" name="race_day" maxLength={40} placeholder="Saturday" />
              </label>
            </div>
          </StateForm>
        </section>
      )}
    </div>
  );
}
