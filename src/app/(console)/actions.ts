"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/console";
import type { ActionState } from "@/lib/types";

/** Colour theme for an organiser's athletes. Site admins and that organiser's owners. */
export async function setTheme(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const org = z.uuid().safeParse(formData.get("organiser_id"));
  const preset = z.enum(["race-night", "monochrome", "daylight"]).safeParse(formData.get("preset"));
  if (!org.success) return { error: "That organiser no longer exists." };
  if (!preset.success) return { error: "Choose a theme." };
  const supabase = await createClient();
  // The database refuses anyone who doesn't run this organiser.
  const { error } = await supabase.rpc("owner_set_theme", { p_org: org.data, p_preset: preset.data });
  if (error) return { error: dbError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Theme saved. Athletes see it next time they open a screen." };
}
