"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

/** Postgres errors raised by our functions are written for people, so pass them on. */
function friendly(message: string | undefined) {
  if (!message) return "Something went wrong. Please try again.";
  return message.length < 140 ? message : "Something went wrong. Please try again.";
}

export async function sendRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile();
  const entryId = z.uuid().safeParse(formData.get("entry_id"));
  const note = z.string().trim().max(280).safeParse(formData.get("note") ?? "");
  if (!entryId.success) return { error: "That listing no longer exists." };
  if (!note.success) return { error: "Keep your note under 280 characters." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_partner_request", { p_to_entry: entryId.data, p_note: note.data });
  if (error) return { error: friendly(error.message) };
  revalidatePath(`/athletes/${entryId.data}`);
  revalidatePath("/requests");
  return { ok: true, message: "Request sent. Chat opens when they accept." };
}
