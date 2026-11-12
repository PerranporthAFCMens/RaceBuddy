"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { PhotoPicker } from "@/components/PhotoPicker";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { TimeInput } from "@/components/TimeInput";
import { parseFinishTime, REGIONS } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { saveProfile } from "./actions";

export function ProfileForm({
  profile,
  photoUrl,
  welcome,
  situation,
}: {
  profile: Profile | null;
  photoUrl: string | null;
  welcome: boolean;
  situation?: string | null;
}) {
  const [state, action] = useActionState(saveProfile, undefined);
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);
  // Optional sections start folded away, unless they already have something in them.
  const hasRacing = Boolean(profile?.best_race_time || profile?.results_url || profile?.strava_url);
  const hasAbout = Boolean(profile?.home_town || profile?.gym || profile?.travel_miles != null || profile?.bio);

  return (
    <ActionForm action={action} className="space-y-5">
      <input type="hidden" name="welcome" value={welcome ? "1" : "0"} />
      {situation && <input type="hidden" name="situation" value={situation} />}
      <PhotoPicker name="photo" currentUrl={photoUrl} />

      <div className="grid grid-cols-2 items-end gap-3">
        <label className="block">
          <span className="field-label">First name</span>
          <input className="input" name="first_name" defaultValue={profile?.first_name ?? ""} autoComplete="given-name" required maxLength={40} />
        </label>
        <label className="block">
          <span className="field-label">Date of birth</span>
          <input
            className="input"
            name="date_of_birth"
            type="date"
            defaultValue={profile?.date_of_birth ?? ""}
            max={maxDob.toISOString().slice(0, 10)}
            readOnly={Boolean(profile?.date_of_birth)}
            aria-describedby="dob-help"
            required
          />
        </label>
      </div>
      <p id="dob-help" className="-mt-3 text-xs text-muted">
        Others see your age, not your date of birth. 18+ only.
        {profile?.date_of_birth ? " Your date of birth can't be changed here. Contact us if it's wrong." : " You can't change it later, so check it."}
      </p>

      <div className="grid grid-cols-2 items-end gap-3">
        <label className="block">
          <span className="field-label">Area</span>
          <select className="input" name="region" defaultValue={profile?.region ?? ""}>
            <option value="">Choose…</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <TimeInput name="five_k" label="5km time" units={["m", "s"]} seconds={profile?.five_k_seconds} minMinutes={10} maxMinutes={60} />
      </div>

      <details className="border border-edge" open={hasRacing || undefined}>
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold uppercase tracking-wide">
          Past races <span className="font-normal normal-case text-muted">(optional)</span>
        </summary>
        <div className="space-y-5 px-3 pb-4">
          <TimeInput
            name="best_race"
            label="Previous race time"
            units={["h", "m", "s"]}
            seconds={parseFinishTime(profile?.best_race_time)}
            optional
            maxHours={5}
          />
          <label className="block">
            <span className="field-label">Results link</span>
            <input
              className="input"
              name="results_url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="dbmaxresults.co.uk/results.aspx?…"
              defaultValue={profile?.results_url ?? ""}
              maxLength={300}
              aria-describedby="results-hint"
            />
            <span id="results-hint" className="mt-1 block text-xs text-muted">
              Open your result on DB Max or HYROX results, then copy the address and paste it here.
            </span>
          </label>
          <label className="block">
            <span className="field-label">Strava profile</span>
            <input
              className="input"
              name="strava_url"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="strava.com/athletes/12345"
              defaultValue={profile?.strava_url ?? ""}
              maxLength={200}
              aria-describedby="strava-hint"
            />
            <span id="strava-hint" className="mt-1 block text-xs text-muted">
              In the Strava app: You, then Share profile, then Copy link.
            </span>
          </label>
        </div>
      </details>

      <details className="border border-edge" open={hasAbout || undefined}>
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold uppercase tracking-wide">
          About you <span className="font-normal normal-case text-muted">(optional)</span>
        </summary>
        <div className="space-y-5 px-3 pb-4">
          <div className="grid grid-cols-2 items-end gap-3">
            <label className="block">
              <span className="field-label">Home town</span>
              <input className="input" name="home_town" defaultValue={profile?.home_town ?? ""} maxLength={80} />
            </label>
            <label className="block">
              <span className="field-label">Gym</span>
              <input className="input" name="gym" defaultValue={profile?.gym ?? ""} maxLength={80} />
            </label>
          </div>
          <label className="block">
            <span className="field-label">Will travel (miles)</span>
            <input className="input" name="travel_miles" type="number" min={0} max={1000} inputMode="numeric" defaultValue={profile?.travel_miles ?? ""} />
          </label>
          <label className="block">
            <span className="field-label">A few words</span>
            <textarea
              className="input min-h-28"
              name="bio"
              maxLength={500}
              placeholder="Strong on the ski erg and wall balls, slower on the sled. Happy to train together."
              defaultValue={profile?.bio ?? ""}
            />
          </label>
        </div>
      </details>

      <FormMessage state={state} />
      <SubmitButton>{welcome ? "Next: what you're looking for" : "Save profile"}</SubmitButton>
    </ActionForm>
  );
}
