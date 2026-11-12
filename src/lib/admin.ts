import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export type AdminReport = {
  id: string;
  created_at: string;
  category: string;
  priority: "urgent" | "high" | "normal";
  status: "open" | "reviewing" | "actioned" | "dismissed";
  reason: string;
  reporter_id: string | null;
  reporter_name: string | null;
  reported_id: string | null;
  reported_name: string | null;
  reported_status: string;
  message_id: string | null;
  conversation_id: string | null;
  evidence_count: number;
};

export type AdminPerson = {
  first_name: string;
  date_of_birth: string;
  age: number;
  joined: string;
  status: string;
  status_message: string | null;
  reports_against: number;
  reports_made: number;
  blocked_by: number;
};

export type EvidenceRow = { sender_id: string | null; sender_name: string | null; body: string; sent_at: string; is_reported: boolean };

export const ADMIN_FILTERS = ["open", "underage", "closed"] as const;
export type AdminFilter = (typeof ADMIN_FILTERS)[number];

/** Admin screens only: anyone else gets "not found", so the page's existence isn't revealed. */
export async function requireAdmin() {
  const { user } = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) notFound();
  return { user, supabase };
}
