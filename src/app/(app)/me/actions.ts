"use server";
import { brand } from "@/design/brand";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMyEntries, requireUser } from "@/lib/data";
import { ageOn, durationFromParts, formatDuration } from "@/lib/format";
import { isSituation } from "@/lib/matching";
import { normaliseResultsUrl } from "@/lib/results-link";
import { normaliseStravaUrl } from "@/lib/strava";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Add your first name.").max(40),
  date_of_birth: z.iso.date("Add your date of birth."),
  region: optionalText(40),
  home_town: optionalText(80),
  travel_miles: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1000), "Travel distance should be 0–1000 miles."),
  gym: optionalText(80),
  five_k_m: z.string().optional(),
  five_k_s: z.string().optional(),
  best_race_h: z.string().optional(),
  best_race_m: z.string().optional(),
  best_race_s: z.string().optional(),
  bio: optionalText(500),
  strava_url: z.string().max(200, "That Strava link is too long.").optional(),
  results_url: z.string().max(300, "That results link is too long.").optional(),
});

export async function saveProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { five_k_m, five_k_s, best_race_h, best_race_m, best_race_s, strava_url, results_url, ...fields } = parsed.data;

  if (ageOn(fields.date_of_birth) < 18) {
    return { error: `${brand.name} is for adults only (18+). Sorry!` };
  }
  const fiveK = durationFromParts({ m: five_k_m, s: five_k_s });
  if (Number.isNaN(fiveK) || (fiveK !== null && (fiveK < 600 || fiveK > 3600))) {
    return { error: "Check your 5km time: pick the minutes (10 to 60) and seconds." };
  }
  const bestRace = durationFromParts({ h: best_race_h, m: best_race_m, s: best_race_s });
  if (Number.isNaN(bestRace) || bestRace === 0 || (bestRace !== null && bestRace > 10 * 3600)) {
    return { error: "Check your previous race time: pick the hours, minutes and seconds." };
  }

  const strava = normaliseStravaUrl(strava_url);
  if (strava === undefined) {
    return { error: "That isn't a Strava profile link. It should look like strava.com/athletes/12345." };
  }
  const results = normaliseResultsUrl(results_url);
  if (results === undefined) {
    return { error: "That results link isn't from a site we know. Use a DB Max or HYROX results page." };
  }

  const supabase = await createClient();
  let photo_path: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "That file isn't a photo." };
    photo_path = `${user.id}/${randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(photo_path, photo, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) return { error: "Your photo didn't upload. Try a different one." };
  }

  const { data: existing } = await supabase.from("profiles").select("photo_path").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    ...fields,
    five_k_seconds: fiveK,
    best_race_time: bestRace === null ? null : formatDuration(bestRace),
    strava_url: strava,
    results_url: results,
    ...(photo_path ? { photo_path } : {}),
  });
  if (error) return { error: error.message.includes("adults only") ? `${brand.name} is for adults only (18+).` : "Couldn't save your profile. Please try again." };

  if (photo_path && existing?.photo_path) {
    await supabase.storage.from("avatars").remove([existing.photo_path]);
  }

  revalidatePath("/", "layout");
  if (formData.get("welcome") === "1" && (await getMyEntries()).length === 0) {
    const situation = formData.get("situation");
    redirect(`/me/race?welcome=1${isSituation(situation) ? `&situation=${situation}` : ""}`);
  }
  return { ok: true, message: "Profile saved." };
}

export async function deleteAccount(formData: FormData) {
  const user = await requireUser();
  if (formData.get("confirm") !== "DELETE") redirect("/me?delete=confirm");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("photo_path").eq("id", user.id).maybeSingle();
  if (profile?.photo_path) await supabase.storage.from("avatars").remove([profile.photo_path]);
  // Deleting the auth user cascades to the profile, listings, requests and messages.
  await createAdminClient().auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
