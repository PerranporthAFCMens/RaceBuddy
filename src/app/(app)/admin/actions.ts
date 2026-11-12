"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, type EvidenceRow } from "@/lib/admin";
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
