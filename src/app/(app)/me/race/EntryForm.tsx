"use client";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { ActionForm } from "@/components/ActionForm";
import { SetupSteps } from "@/components/SetupSteps";
import { SubmitButton } from "@/components/SubmitButton";
import { TicketFlag } from "@/components/TicketFlag";
import { categoryLabel, formatRaceTime, REGIONS } from "@/lib/format";
import { FIVE_K_RANGES, SITUATIONS, type Situation } from "@/lib/matching";
import type { Category, Entry } from "@/lib/types";
import { saveEntry } from "./actions";

const pick =
  "flex min-h-11 cursor-pointer items-center gap-2 border border-edge px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:text-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent";

export function EntryForm({
  eventId,
  categories,
  entry,
  welcome,
  initialSituation,
  myRegion,
  myFiveK,
  email,
}: {
  eventId: string;
  categories: Category[];
  entry: Entry | null;
  welcome: boolean;
  initialSituation: Situation | null;
  myRegion: string | null;
  myFiveK: number | null;
  email: string | null;
}) {
  const [state, action] = useActionState(saveEntry, undefined);
  const [situation, setSituation] = useState<Situation | null>(entry?.situation ?? initialSituation);
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? "");
  const [wanted, setWanted] = useState<string[]>(entry?.wanted_category_ids ?? []);
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const hasTicket = situation === "spare_spot";
  const category = categories.find((c) => c.id === categoryId);
  const isRelay = hasTicket && category?.team_size === 4;
  const days = [...new Set(categories.map((c) => c.race_day ?? "Any day"))];
  const showDetails = !welcome || step === 2;
  const regions = entry ? entry.partner_regions : myRegion ? [myRegion] : [];

  function next() {
    if (!situation) return setStepError("Choose what you're looking for.");
    if (hasTicket && !categoryId) return setStepError("Choose the category on your ticket.");
    if (!hasTicket && wanted.length === 0) return setStepError("Choose at least one category you'd race.");
    setStepError(null);
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="welcome" value={welcome ? "1" : "0"} />
      {welcome && <SetupSteps current={step + 1} />}

      <div className="space-y-6" hidden={welcome && step !== 1}>
        <fieldset className="space-y-3">
          <legend className="field-label">What are you looking for?</legend>
          {SITUATIONS.map((opt) => (
            <label
              key={opt.value}
              className={`grid cursor-pointer grid-cols-[36px_1fr] items-start gap-3 border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                situation === opt.value ? "border-accent bg-accent/10" : "border-edge"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center border font-display text-lg ${
                  situation === opt.value ? "border-accent bg-accent text-accent-ink" : "border-edge text-accent"
                }`}
                aria-hidden
              >
                {opt.letter}
              </span>
              <span>
                <b className="block text-sm uppercase">{opt.title}</b>
                <span className="text-sm text-muted">{opt.sub}</span>
              </span>
              <input
                type="radio"
                name="situation"
                value={opt.value}
                checked={situation === opt.value}
                onChange={() => setSituation(opt.value)}
                className="sr-only"
                required
              />
            </label>
          ))}
        </fieldset>

        {hasTicket && (
          <div className="space-y-5">
            <label className="block">
              <span className="field-label">Category on your ticket</span>
              <select className="input" name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
              <span className="mt-2 block space-y-1 text-xs text-muted">
                <TicketFlag hasTicket verified />
                <span className="block">Add it to get this badge. We only check the order exists and matches your category.</span>
              </span>
            </label>
          </div>
        )}

        {situation && !hasTicket && (
          <fieldset className="space-y-4">
            <legend className="field-label">Categories you&apos;d race</legend>
            {days.map((day) => (
              <div key={day}>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">{day}</p>
                <div className="grid grid-cols-2 gap-2">
                  {categories
                    .filter((c) => (c.race_day ?? "Any day") === day)
                    .map((c) => (
                      <label key={c.id} className={pick}>
                        <input
                          type="checkbox"
                          name="wanted_category_ids"
                          value={c.id}
                          checked={wanted.includes(c.id)}
                          onChange={(e) =>
                            setWanted((w) => (e.target.checked ? [...w, c.id] : w.filter((id) => id !== c.id)))
                          }
                          className="h-4 w-4 shrink-0 accent-accent"
                        />
                        {c.name}
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </fieldset>
        )}

        {welcome && (
          <>
            {stepError && (
              <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
                {stepError}
              </p>
            )}
            <button type="button" className="btn-gold w-full" onClick={next}>
              Next: who you want
            </button>
          </>
        )}
      </div>

      <div className="space-y-6" hidden={!showDetails}>
        {welcome && (
          <div className="text-center">
            <h2 className="text-lg uppercase">Who are you after?</h2>
            <p className="text-sm text-muted">We&apos;ll show these people first and email you when one joins.</p>
          </div>
        )}
        {!welcome && <h2 className="heading pt-2">Who you&apos;re after</h2>}

        <fieldset>
          <legend className="field-label">
            Ability{myFiveK ? ` · your 5km is ${formatRaceTime(myFiveK)}` : ""}
          </legend>
          <div className="mt-1 grid grid-cols-4 gap-2">
            {FIVE_K_RANGES.map((r) => (
              <label key={r.label} className={`${pick} justify-center px-1`}>
                <input
                  type="radio"
                  name="partner_five_k_range"
                  value={r.value ?? ""}
                  defaultChecked={(entry?.partner_five_k_range ?? null) === r.value}
                  className="sr-only"
                />
                {r.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            {myFiveK
              ? "Partner's 5km time compared with yours. People who haven't added a time still show."
              : "Add your 5km time in your profile to use this."}
          </p>
        </fieldset>

        <fieldset>
          <legend className="field-label">Where they train</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {REGIONS.map((r) => (
              <label key={r} className={pick}>
                <input
                  type="checkbox"
                  name="partner_regions"
                  value={r}
                  defaultChecked={regions.includes(r)}
                  className="h-4 w-4 shrink-0 accent-accent"
                />
                {r}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Leave all unticked for anywhere.</p>
        </fieldset>

        <label className="block">
          <span className="field-label">Anything else? (shown on your card)</span>
          <textarea
            className="input min-h-20"
            name="note"
            maxLength={280}
            placeholder="Partner's injured. Looking for someone around a 23 min 5km, happy to train in Exeter."
            defaultValue={entry?.note ?? ""}
          />
        </label>

        <label id="alerts" className="flex cursor-pointer items-center justify-between gap-3 border border-edge p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          <span>
            <b className="block text-sm uppercase">Email me new matches</b>
            <span className="text-sm text-muted">
              {email ? `To ${email}. ` : ""}At most one email every 6 hours.
            </span>
          </span>
          <input
            type="checkbox"
            name="alerts_email"
            value="on"
            defaultChecked={entry?.alerts_email ?? true}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-6 w-11 shrink-0 bg-edge after:absolute after:top-1 after:left-1 after:h-4 after:w-4 after:bg-muted after:transition-all peer-checked:bg-accent peer-checked:after:left-6 peer-checked:after:bg-accent-ink"
          />
        </label>

        {entry && entry.status !== "matched" && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="status"
              value="paused"
              defaultChecked={entry.status === "paused"}
              className="h-5 w-5 accent-accent"
            />
            Hide me from the feed for now
          </label>
        )}
        <FormMessage state={state} />
        <div className="flex gap-2">
          {welcome && (
            <button type="button" className="btn-line" onClick={() => setStep(1)}>
              Back
            </button>
          )}
          <SubmitButton className="btn-gold flex-1">{welcome ? "Show my matches" : "Save"}</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
