"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const fullName = z.string().trim().min(3, "Enter your full name as it should appear on the start list.").max(80);

function friendly(message: string | undefined) {
  return message && message.length < 140 ? message : "Something went wrong. Please try again.";
}

export async function proposeLockin(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const conv = z.uuid().safeParse(formData.get("conversation_id"));
  const partner = z.uuid().safeParse(formData.get("partner_id"));
  const name = fullName.safeParse(formData.get("full_name"));
  if (!conv.success || !partner.success) return { error: "Choose who to lock in." };
  if (!name.success) return { error: name.error.issues[0]?.message };
  if (formData.get("consent") !== "on") return { error: "Tick the box to agree to share your name with the organiser." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_lockin", {
    p_conversation: conv.data,
    p_partner: partner.data,
    p_full_name: name.data,
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/chats/${conv.data}`);
  return { ok: true };
}

export async function respondToLockin(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const lockin = z.uuid().safeParse(formData.get("lockin_id"));
  const conv = z.uuid().safeParse(formData.get("conversation_id"));
  if (!lockin.success || !conv.success) return { error: "That lock-in no longer exists." };
  const accept = formData.get("answer") === "accept";
  let name: string | null = null;
  if (accept) {
    const parsed = fullName.safeParse(formData.get("full_name"));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    if (formData.get("consent") !== "on") return { error: "Tick the box to agree to share your name with the organiser." };
    name = parsed.data;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_lockin", {
    p_lockin: lockin.data,
    p_accept: accept,
    p_full_name: name,
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelLockin(formData: FormData) {
  await requireProfile();
  const lockin = z.uuid().parse(formData.get("lockin_id"));
  const conv = z.uuid().parse(formData.get("conversation_id"));
  const supabase = await createClient();
  await supabase.rpc("cancel_lockin", { p_lockin: lockin });
  revalidatePath(`/chats/${conv}`);
}

export async function blockUser(formData: FormData) {
  const { user } = await requireProfile();
  const other = z.uuid().parse(formData.get("user_id"));
  const supabase = await createClient();
  await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: other }, { onConflict: "blocker_id,blocked_id" });
  revalidatePath("/", "layout");
  redirect("/chats");
}

export async function reportUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProfile();
  const other = z.uuid().safeParse(formData.get("user_id"));
  const conv = z.uuid().safeParse(formData.get("conversation_id"));
  const reason = z.string().trim().min(5, "Tell us briefly what happened.").max(1000).safeParse(formData.get("reason"));
  if (!other.success) return { error: "Choose who to report." };
  if (!reason.success) return { error: reason.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: other.data,
    conversation_id: conv.success ? conv.data : null,
    reason: reason.data,
  });
  if (error) return { error: "Couldn't send your report. Please try again." };
  return { ok: true, message: "Thanks. The Race Buddy team will review this." };
}
