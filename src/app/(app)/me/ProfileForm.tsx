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
            required
          />
        </label>
      </div>
      <p className="-mt-3 text-xs text-muted">Others see your age, not your date of birth. 18+ only.</p>

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
        <label className="block">
          <span className="field-label">Home town <span className="font-normal normal-case">(optional)</span></span>
          <input className="input" name="home_town" defaultValue={profile?.home_town ?? ""} maxLength={80} />
        </label>
      </div>

      <div className="grid grid-cols-2 items-end gap-3">
        <label className="block">
          <span className="field-label">Will travel (miles) <span className="font-normal normal-case">(optional)</span></span>
          <input className="input" name="travel_miles" type="number" min={0} max={1000} inputMode="numeric" defaultValue={profile?.travel_miles ?? ""} />
        </label>
        <label className="block">
          <span className="field-label">Gym <span className="font-normal normal-case">(optional)</span></span>
          <input className="input" name="gym" defaultValue={profile?.gym ?? ""} maxLength={80} />
        </label>
      </div>

      <TimeInput name="five_k" label="5km time" units={["m", "s"]} seconds={profile?.five_k_seconds} minMinutes={10} maxMinutes={60} />
      <TimeInput
        name="best_race"
        label="Previous race time"
        units={["h", "m", "s"]}
        seconds={parseFinishTime(profile?.best_race_time)}
        optional
        maxHours={5}
      />

      <label className="block">
        <span className="field-label">Strava profile <span className="font-normal normal-case">(optional)</span></span>
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
          In the Strava app: You, then Share profile, then Copy link. Other athletes can open it.
        </span>
      </label>

      <label className="block">
        <span className="field-label">About you <span className="font-normal normal-case">(optional)</span></span>
        <textarea
          className="input min-h-28"
          name="bio"
          maxLength={500}
          placeholder="Strong on the ski erg and wall balls, slower on the sled. Happy to train together."
          defaultValue={profile?.bio ?? ""}
        />
      </label>

      <FormMessage state={state} />
      <SubmitButton>{welcome ? "Next: what you're looking for" : "Save profile"}</SubmitButton>
    </ActionForm>
  );
}
