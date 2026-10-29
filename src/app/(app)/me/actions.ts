"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMyEntries, requireUser } from "@/lib/data";
import { ageOn, parseRaceTime } from "@/lib/format";
import { isSituation } from "@/lib/matching";
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
  five_k: z.string().trim(),
  best_race_time: optionalText(60),
  bio: optionalText(500),
});

export async function saveProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { five_k, ...fields } = parsed.data;

  if (ageOn(fields.date_of_birth) < 18) {
    return { error: "Race Buddy is for adults only (18+). Sorry!" };
  }
  const fiveK = parseRaceTime(five_k);
  if (Number.isNaN(fiveK) || (fiveK !== null && (fiveK < 600 || fiveK > 3600))) {
    return { error: "Enter your 5km time as minutes:seconds, for example 22:40." };
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
    ...(photo_path ? { photo_path } : {}),
  });
  if (error) return { error: error.message.includes("adults only") ? "Race Buddy is for adults only (18+)." : "Couldn't save your profile. Please try again." };

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
