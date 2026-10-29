"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { sendPendingAlerts } from "@/lib/alerts/send";
import { requireProfile } from "@/lib/data";
import { REGIONS } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkOrder } from "@/lib/ticket-tailor/client";
import { normaliseOrderReference } from "@/lib/ticket-tailor/parse";
import type { ActionState } from "@/lib/types";

const entrySchema = z.object({
  event_id: z.uuid(),
  situation: z.enum(["spare_spot", "need_spot", "single"], "Choose what you're looking for."),
  category_id: z.string().optional(),
  wanted_category_ids: z.array(z.uuid()).default([]),
  partner_five_k_range: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || [60, 120, 240].includes(v), "Choose an ability range."),
  partner_regions: z.array(z.enum(REGIONS)).default([]),
  alerts_email: z.literal("on").optional(),
  team_name: z.string().trim().max(60).optional(),
  spots_needed: z.coerce.number().int().min(1).max(3).default(1),
  stations: z.string().trim().max(120).optional(),
  order_reference: z.string().trim().max(40).optional(),
  note: z.string().trim().max(280).optional(),
  status: z.enum(["looking", "paused"]).default("looking"),
});

const REASONS: Record<string, string> = {
  not_found: "We couldn't find that order. Check the reference in your KeltX confirmation email.",
  wrong_event: "That order is for a different race.",
  cancelled: "That order has been cancelled.",
  wrong_category: "That order doesn't have a valid ticket in the category you chose.",
};

export async function saveEntry(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireProfile();
  const parsed = entrySchema.safeParse({
    ...Object.fromEntries(formData),
    wanted_category_ids: formData.getAll("wanted_category_ids"),
    partner_regions: formData.getAll("partner_regions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const hasTicket = d.situation === "spare_spot";

  const supabase = await createClient();
  const [{ data: event }, { data: categories }, { data: existing }] = await Promise.all([
    supabase.from("events").select("id, slug, tt_event_id").eq("id", d.event_id).single(),
    supabase.from("categories").select("id, team_size, race_day, tt_ticket_type_id").eq("event_id", d.event_id),
    supabase.from("entries").select("status").eq("user_id", user.id).eq("event_id", d.event_id).maybeSingle(),
  ]);
  if (!event || !categories) return { error: "That race isn't available." };

  const category = categories.find((c) => c.id === d.category_id);
  if (hasTicket && !category) return { error: "Choose the category on your ticket." };
  const wanted = d.wanted_category_ids.filter((id) => categories.some((c) => c.id === id));
  if (!hasTicket && wanted.length === 0) return { error: "Choose at least one category you'd race." };

  const isRelay = hasTicket && category?.team_size === 4;
  let orderRef: string | null = null;
  if (hasTicket && d.order_reference) {
    orderRef = normaliseOrderReference(d.order_reference);
    if (!orderRef) return { error: "Order references look like or_12345678. Leave it blank to skip the check." };
  }

  const row = {
    user_id: user.id,
    event_id: event.id,
    has_ticket: hasTicket,
    category_id: hasTicket ? category!.id : null,
    wanted_category_ids: hasTicket ? [] : wanted,
    // Race days follow from the categories chosen.
    race_days: [
      ...new Set(
        (hasTicket ? [category!] : categories.filter((c) => wanted.includes(c.id)))
          .map((c) => c.race_day)
          .filter((day): day is string => Boolean(day)),
      ),
    ],
    situation: d.situation,
    partner_five_k_range: d.partner_five_k_range,
    partner_regions: d.partner_regions,
    alerts_email: d.alerts_email === "on",
    team_name: isRelay ? d.team_name || null : null,
    spots_needed: isRelay ? d.spots_needed : 1,
    stations: isRelay ? d.stations || null : null,
    order_reference: orderRef,
    note: d.note || null,
    // A locked-in listing stays matched when edited.
    status: existing?.status === "matched" ? "matched" : d.status,
  };

  const { data: saved, error } = await supabase
    .from("entries")
    .upsert(row, { onConflict: "user_id,event_id" })
    .select("id, ticket_verified, status")
    .single();
  if (error || !saved) return { error: "Couldn't save your listing. Please try again." };

  let message = "Listing saved.";
  if (hasTicket && orderRef && !saved.ticket_verified && event.tt_event_id && category?.tt_ticket_type_id) {
    try {
      const result = await checkOrder({
        orderId: orderRef,
        ttEventId: event.tt_event_id,
        ttTicketTypeId: category.tt_ticket_type_id,
      });
      if (result.ok) {
        const { error: verifyError } = await createAdminClient()
          .from("entries")
          .update({ ticket_verified: true, verified_at: new Date().toISOString() })
          .eq("id", saved.id);
        message = verifyError
          ? "Listing saved. That order is already verified on another listing, so we couldn't add the badge."
          : "Listing saved and your ticket is verified.";
      } else {
        message = `Listing saved, but your ticket isn't verified yet. ${REASONS[result.reason]}`;
      }
    } catch {
      message = "Listing saved. We couldn't reach Ticket Tailor to check your ticket, so try saving again later.";
    }
  }

  // The database has queued alerts for anyone this listing suits; email them
  // after the response so saving stays quick.
  after(async () => {
    try {
      const { data: queued } = await createAdminClient()
        .from("match_alerts")
        .select("user_id")
        .eq("match_entry_id", saved.id)
        .is("emailed_at", null);
      const ids = [...new Set((queued ?? []).map((r: { user_id: string }) => r.user_id))];
      if (ids.length) await sendPendingAlerts(ids);
    } catch (e) {
      console.error("Match alerts failed", e);
    }
  });

  revalidatePath("/", "layout");
  if (formData.get("welcome") === "1") redirect(`/browse?event=${event.slug}&new=1`);
  return { ok: true, message };
}

export async function deleteEntry(formData: FormData) {
  const { user } = await requireProfile();
  const id = z.uuid().safeParse(formData.get("entry_id"));
  if (id.success) {
    const supabase = await createClient();
    await supabase.from("entries").delete().eq("id", id.data).eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
  redirect("/me");
}
