"use client";
import { useActionState } from "react";
import { FormMessage } from "@/components/FormMessage";
import { PhotoPicker } from "@/components/PhotoPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { formatRaceTime, REGIONS } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { saveProfile } from "./actions";

export function ProfileForm({
  profile,
  photoUrl,
  welcome,
}: {
  profile: Profile | null;
  photoUrl: string | null;
  welcome: boolean;
}) {
  const [state, action] = useActionState(saveProfile, undefined);
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="welcome" value={welcome ? "1" : "0"} />
      <PhotoPicker name="photo" currentUrl={photoUrl} />

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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
          <span className="field-label">Home town</span>
          <input className="input" name="home_town" defaultValue={profile?.home_town ?? ""} maxLength={80} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">Will travel (miles)</span>
          <input className="input" name="travel_miles" type="number" min={0} max={1000} inputMode="numeric" defaultValue={profile?.travel_miles ?? ""} />
        </label>
        <label className="block">
          <span className="field-label">Gym</span>
          <input className="input" name="gym" defaultValue={profile?.gym ?? ""} maxLength={80} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">5km time</span>
          <input className="input" name="five_k" placeholder="22:40" inputMode="numeric" defaultValue={formatRaceTime(profile?.five_k_seconds)} />
        </label>
        <label className="block">
          <span className="field-label">Previous race time</span>
          <input className="input" name="best_race_time" placeholder="Cornwall 1:21:12" defaultValue={profile?.best_race_time ?? ""} maxLength={60} />
        </label>
      </div>

      <label className="block">
        <span className="field-label">About you</span>
        <textarea
          className="input min-h-28"
          name="bio"
          maxLength={500}
          placeholder="Strong on the ski erg and wall balls, slower on the sled. Happy to train together."
          defaultValue={profile?.bio ?? ""}
        />
      </label>

      <FormMessage state={state} />
      <SubmitButton>{welcome ? "Save and continue" : "Save profile"}</SubmitButton>
    </form>
  );
}
