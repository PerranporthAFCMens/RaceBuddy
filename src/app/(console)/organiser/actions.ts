"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbError, formDate, optional } from "@/lib/console";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

// The database checks that the signed-in person runs this event's organiser
// (or is a site admin) and logs every change.

/** Taking a racer off an event is the organiser's decision only (Adam, 2026-11-14), not the site admin's. */
async function refuseAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ActionState | null> {
  const { data } = await supabase.rpc("is_admin");
  return data === true ? { error: "Only the event's organiser can take racers off or put them back." } : null;
}

export async function updateEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const event = z.uuid().safeParse(formData.get("event_id"));
  if (!event.success) return { error: "That event no longer exists." };
  const starts = formDate(formData.get("starts_on"));
  if (!starts) return { error: "Choose the first day." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_update_event", {
    p_event: event.data,
    p_name: String(formData.get("name") ?? ""),
    p_venue: optional(formData.get("venue")),
    p_starts: starts,
    p_ends: formDate(formData.get("ends_on")) ?? starts,
    p_ticket_url: optional(formData.get("ticket_url")),
    p_cutoff: formDate(formData.get("name_change_cutoff")),
  });
  if (error) return { error: dbError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function hideMember(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const event = z.uuid().safeParse(formData.get("event_id"));
  const user = z.uuid().safeParse(formData.get("user_id"));
  const reason = z.string().trim().max(280).safeParse(formData.get("reason") ?? "");
  if (!event.success || !user.success) return { error: "That listing no longer exists." };
  if (!reason.success) return { error: "Keep the reason under 280 characters." };
  const supabase = await createClient();
  const refused = await refuseAdmin(supabase);
  if (refused) return refused;
  const { error } = await supabase.rpc("owner_hide_member", { p_event: event.data, p_user: user.data, p_reason: reason.data || null });
  if (error) return { error: dbError(error) };
  revalidatePath("/organiser", "layout");
  return { ok: true, message: "Taken off this event." };
}

export async function restoreMember(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const event = z.uuid().safeParse(formData.get("event_id"));
  const user = z.uuid().safeParse(formData.get("user_id"));
  if (!event.success || !user.success) return { error: "That listing no longer exists." };
  const supabase = await createClient();
  const refused = await refuseAdmin(supabase);
  if (refused) return refused;
  const { error } = await supabase.rpc("owner_unhide_member", { p_event: event.data, p_user: user.data });
  if (error) return { error: dbError(error) };
  revalidatePath("/organiser", "layout");
  return { ok: true, message: "Back on this event." };
}
