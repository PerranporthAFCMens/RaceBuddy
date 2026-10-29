"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { TicketFlag } from "@/components/TicketFlag";
import { categoryLabel } from "@/lib/format";
import type { Category, Entry } from "@/lib/types";
import { saveEntry } from "./actions";

export function EntryForm({
  eventId,
  categories,
  entry,
  welcome,
}: {
  eventId: string;
  categories: Category[];
  entry: Entry | null;
  welcome: boolean;
}) {
  const [state, action] = useActionState(saveEntry, undefined);
  const [hasTicket, setHasTicket] = useState<boolean | null>(entry ? entry.has_ticket : null);
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? "");
  const category = categories.find((c) => c.id === categoryId);
  const isRelay = hasTicket && category?.team_size === 4;
  const days = [...new Set(categories.map((c) => c.race_day).filter(Boolean))] as string[];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="welcome" value={welcome ? "1" : "0"} />

      <fieldset className="space-y-3">
        <legend className="field-label">Do you have a ticket?</legend>
        {[
          { value: true, title: "Yes, I'm entered", sub: "My partner or teammate has dropped out" },
          { value: false, title: "No ticket yet", sub: "I want to join a team" },
        ].map((opt) => (
          <label
            key={String(opt.value)}
            className={`flex cursor-pointer items-center justify-between gap-3 border p-3 ${
              hasTicket === opt.value ? "border-accent" : "border-edge"
            }`}
          >
            <span>
              <b className="block text-sm uppercase">{opt.title}</b>
              <span className="text-sm text-muted">{opt.sub}</span>
            </span>
            <input
              type="radio"
              name="has_ticket"
              value={opt.value ? "yes" : "no"}
              checked={hasTicket === opt.value}
              onChange={() => setHasTicket(opt.value)}
              className="h-5 w-5 accent-[var(--accent)]"
              required
            />
          </label>
        ))}
      </fieldset>

      {hasTicket === true && (
        <div className="space-y-5">
          <label className="block">
            <span className="field-label">Category on your ticket</span>
            <select
              className="input"
              name="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>

          {isRelay && (
            <div className="space-y-4 border border-edge p-4">
              <p className="text-sm text-muted">Relay teams show as a team listing, like &quot;Team Granite needs 1 of 4&quot;.</p>
              <label className="block">
                <span className="field-label">Team name</span>
                <input className="input" name="team_name" maxLength={60} defaultValue={entry?.team_name ?? ""} />
              </label>
              <label className="block">
                <span className="field-label">Athletes needed</span>
                <select className="input" name="spots_needed" defaultValue={String(entry?.spots_needed ?? 1)}>
                  <option value="1">1 of 4</option>
                  <option value="2">2 of 4</option>
                  <option value="3">3 of 4</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">Stations to cover</span>
                <input className="input" name="stations" placeholder="SkiErg and Row" maxLength={120} defaultValue={entry?.stations ?? ""} />
              </label>
            </div>
          )}

          <label className="block">
            <span className="field-label">Order reference (optional)</span>
            <input
              className="input"
              name="order_reference"
              placeholder="or_12345678"
              defaultValue={entry?.order_reference ?? ""}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <span className="mt-1 flex items-center gap-2 text-xs text-muted">
              Add it to get the <TicketFlag hasTicket verified /> badge. We only check the order exists and matches your category.
            </span>
          </label>
        </div>
      )}

      {hasTicket === false && (
        <div className="space-y-5">
          <fieldset>
            <legend className="field-label">Categories you&apos;d race</legend>
            <div className="mt-2 grid gap-2">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-3 border border-edge px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="wanted_category_ids"
                    value={c.id}
                    defaultChecked={entry?.wanted_category_ids.includes(c.id)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                  {categoryLabel(c)}
                </label>
              ))}
            </div>
          </fieldset>
          {days.length > 1 && (
            <fieldset>
              <legend className="field-label">Race days you can do</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {days.map((d) => (
                  <label key={d} className="chip gap-2">
                    <input
                      type="checkbox"
                      name="race_days"
                      value={d}
                      defaultChecked={entry ? entry.race_days.includes(d) : true}
                      className="accent-[var(--accent)]"
                    />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {hasTicket !== null && (
        <>
          <label className="block">
            <span className="field-label">What are you looking for?</span>
            <textarea
              className="input min-h-20"
              name="note"
              maxLength={280}
              placeholder="Looking for someone around a 23 min 5km, happy to train in Exeter."
              defaultValue={entry?.note ?? ""}
            />
          </label>
          {entry && entry.status !== "matched" && (
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="status"
                value="paused"
                defaultChecked={entry.status === "paused"}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              Hide me from the feed for now
            </label>
          )}
          <FormMessage state={state} />
          <SubmitButton>{welcome ? "Save and start browsing" : "Save listing"}</SubmitButton>
        </>
      )}
    </form>
  );
}
