"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, type EvidenceRow } from "@/lib/admin";
import { dbError, formDate, optional } from "@/lib/console";
import { requireProfile } from "@/lib/data";
import type { ActionState } from "@/lib/types";

const ACTIONS = ["review", "dismiss", "resolve", "warn", "suspend", "ban", "reinstate", "note"] as const;

export async function moderateReport(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  // Database functions refuse non-admins too; this also hides the screens.
  const { supabase } = await requireAdmin();
  const report = z.uuid().safeParse(formData.get("report_id"));
  const action = z.enum(ACTIONS).safeParse(formData.get("action"));
  const note = z.string().trim().max(1000).safeParse(formData.get("note") ?? "");
  const message = z.string().trim().max(500).safeParse(formData.get("message") ?? "");
  if (!report.success) return { error: "That report no longer exists." };
  if (!action.success) return { error: "Choose what to do." };
  if (!note.success || !message.success) return { error: "Keep the note under 1,000 characters and the message under 500." };
  if (action.data !== "review" && note.data.length < 5) return { error: "Write a short note saying why. It goes in the log." };

  const { error } = await supabase.rpc("moderate", {
    p_action: action.data,
    p_report: report.data,
    p_note: note.data || null,
    p_message: message.data || null,
  });
  if (error) return { error: error.message.length < 140 ? error.message : "Couldn't save that. Please try again." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved and logged." };
}

export type EvidenceState = { error?: string; rows?: EvidenceRow[] } | undefined;

export async function viewEvidence(_: EvidenceState, formData: FormData): Promise<EvidenceState> {
  await requireProfile();
  // Database functions refuse non-admins too; this also hides the screens.
  const { supabase } = await requireAdmin();
  const report = z.uuid().safeParse(formData.get("report_id"));
  const reason = z.string().trim().min(5, "Say briefly why you need to see the messages.").max(500).safeParse(formData.get("reason"));
  if (!report.success) return { error: "That report no longer exists." };
  if (!reason.success) return { error: reason.error.issues[0]?.message };
  const { data, error } = await supabase.rpc("admin_report_evidence", { p_report: report.data, p_reason: reason.data });
  if (error) return { error: "Couldn't load the messages. Please try again." };
  return { rows: (data as EvidenceRow[] | null) ?? [] };
}

const PERSON_ACTIONS = ["warn", "suspend", "ban", "reinstate", "note"] as const;

/** An action on a person from the People screen (no report). */
export async function moderatePerson(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  // Database functions refuse non-admins too; this also hides the screens.
  const { supabase } = await requireAdmin();
  const user = z.uuid().safeParse(formData.get("user_id"));
  const action = z.enum(PERSON_ACTIONS).safeParse(formData.get("action"));
  const note = z.string().trim().min(5).max(1000).safeParse(formData.get("note") ?? "");
  const message = z.string().trim().max(500).safeParse(formData.get("message") ?? "");
  if (!user.success) return { error: "That account no longer exists." };
  if (!action.success) return { error: "Choose what to do." };
  if (!note.success) return { error: "Write a short note saying why (5 to 1,000 characters). It goes in the log." };
  if (!message.success) return { error: "Keep the message under 500 characters." };
  const { error } = await supabase.rpc("moderate", {
    p_action: action.data,
    p_user: user.data,
    p_note: note.data,
    p_message: message.data || null,
  });
  if (error) return { error: error.message.length < 140 ? error.message : "Couldn't save that. Please try again." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved and logged." };
}

// ---------------------------------------------------------------------------
// Organisers, owners, events and categories. The database checks the admin
// role and the rules again, and logs every change.
// ---------------------------------------------------------------------------

export async function saveOrganiser(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const { supabase } = await requireAdmin();
  const id = optional(formData.get("organiser_id"));
  if (id && !z.uuid().safeParse(id).success) return { error: "That organiser no longer exists." };
  const { data, error } = await supabase.rpc("admin_save_organiser", {
    p_id: id,
    p_name: String(formData.get("name") ?? ""),
    p_slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    p_website_url: optional(formData.get("website_url")),
  });
  if (error) return { error: dbError(error) };
  revalidatePath("/admin", "layout");
  if (!id) redirect(`/admin/organisers/${data as string}`);
  return { ok: true, message: "Saved." };
}

export async function addOwner(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const { supabase } = await requireAdmin();
  const org = z.uuid().safeParse(formData.get("organiser_id"));
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!org.success) return { error: "That organiser no longer exists." };
  if (!email.success) return { error: "Enter their email address." };
  const { error } = await supabase.rpc("admin_add_owner", { p_org: org.data, p_email: email.data });
  if (error) return { error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Added. They'll see Event console on their profile." };
}

export async function removeOwner(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const { supabase } = await requireAdmin();
  const org = z.uuid().safeParse(formData.get("organiser_id"));
  const email = String(formData.get("email") ?? "");
  if (!org.success) return { error: "That organiser no longer exists." };
  const { error } = await supabase.rpc("admin_remove_owner", { p_org: org.data, p_email: email });
  if (error) return { error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Removed." };
}

export async function saveEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const { supabase } = await requireAdmin();
  const id = optional(formData.get("event_id"));
  const org = z.uuid().safeParse(formData.get("organiser_id"));
  if (id && !z.uuid().safeParse(id).success) return { error: "That event no longer exists." };
  if (!org.success) return { error: "Choose an organiser." };
  const starts = formDate(formData.get("starts_on"));
  const ends = formDate(formData.get("ends_on")) ?? starts;
  if (!starts) return { error: "Choose the start date." };
  const { data, error } = await supabase.rpc("admin_save_event", {
    p_id: id,
    p_organiser: org.data,
    p_slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    p_name: String(formData.get("name") ?? ""),
    p_venue: optional(formData.get("venue")),
    p_starts: starts,
    p_ends: ends,
    p_ticket_url: optional(formData.get("ticket_url")),
    p_cutoff: formDate(formData.get("name_change_cutoff")),
    p_active: formData.get("is_active") === "on",
  });
  if (error) return { error: dbError(error) };
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/events/${data as string}`);
  return { ok: true, message: "Saved." };
}

export async function addCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const { supabase } = await requireAdmin();
  const event = z.uuid().safeParse(formData.get("event_id"));
  if (!event.success) return { error: "That event no longer exists." };
  const { error } = await supabase.rpc("admin_add_category", {
    p_event: event.data,
    p_name: String(formData.get("name") ?? ""),
    p_division: String(formData.get("division") ?? ""),
    p_gender: String(formData.get("gender") ?? ""),
    p_race_day: optional(formData.get("race_day")),
    p_team_size: Number(formData.get("team_size")),
  });
  if (error) return { error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Category added." };
}

export async function removeCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const { supabase } = await requireAdmin();
  const cat = z.uuid().safeParse(formData.get("category_id"));
  if (!cat.success) return { error: "That category no longer exists." };
  const { error } = await supabase.rpc("admin_remove_category", { p_category: cat.data });
  if (error) return { error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Removed." };
}
