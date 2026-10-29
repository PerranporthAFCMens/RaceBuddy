"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function respondToRequest(formData: FormData) {
  await requireProfile();
  const id = z.uuid().parse(formData.get("request_id"));
  const accept = formData.get("answer") === "accept";
  const supabase = await createClient();
  const { data: conversationId, error } = await supabase.rpc("respond_to_partner_request", {
    p_request: id,
    p_accept: accept,
  });
  revalidatePath("/", "layout");
  if (error) redirect(`/requests?error=${encodeURIComponent(error.message.slice(0, 140))}`);
  if (accept && conversationId) redirect(`/chats/${conversationId}`);
}

export async function withdrawRequest(formData: FormData) {
  await requireProfile();
  const id = z.uuid().parse(formData.get("request_id"));
  const supabase = await createClient();
  await supabase.rpc("withdraw_partner_request", { p_request: id });
  revalidatePath("/requests");
}
