"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/data";
import { isReportCategory, isSuspendedError, reportCategoryLabel, safeBlockRedirect, SUSPENDED_TEXT } from "@/lib/safety";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

/** Report a person, a chat or one message. The database checks the person
 *  reporting is in that chat, fills in who sent a message and sets priority. */
export async function reportUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProfile();
  const other = z.uuid().safeParse(formData.get("user_id"));
  const conv = z.uuid().safeParse(formData.get("conversation_id"));
  const message = z.uuid().safeParse(formData.get("message_id"));
  const category = formData.get("category");
  const details = z.string().trim().max(1000, "Keep it under 1,000 characters.").safeParse(formData.get("reason") ?? "");
  if (!other.success && !message.success) return { error: "Choose who to report." };
  if (!isReportCategory(category)) return { error: "Choose what's wrong." };
  if (!details.success) return { error: details.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: other.success ? other.data : null,
    conversation_id: conv.success ? conv.data : null,
    message_id: message.success ? message.data : null,
    category,
    reason: details.data || reportCategoryLabel(category),
  });
  if (error) {
    if (error.message.startsWith("Slow down")) return { error: error.message };
    if (isSuspendedError(error.message)) return { error: SUSPENDED_TEXT };
    return { error: "Couldn't send your report. Please try again." };
  }
  return {
    ok: true,
    message: "Thanks, your report has been sent. We review every report, and they won't be told who reported them.",
  };
}

export async function blockUser(formData: FormData) {
  const { user } = await requireProfile();
  const other = z.uuid().parse(formData.get("user_id"));
  const supabase = await createClient();
  await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: other }, { onConflict: "blocker_id,blocked_id" });
  revalidatePath("/", "layout");
  redirect(safeBlockRedirect(formData.get("next")));
}

export async function unblockUser(formData: FormData) {
  const { user } = await requireProfile();
  const other = z.uuid().parse(formData.get("user_id"));
  const supabase = await createClient();
  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", other);
  revalidatePath("/", "layout");
}
