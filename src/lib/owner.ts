import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export type OwnerOrganiser = { id: string; slug: string; name: string; theme: unknown };

export type OwnerEvent = {
  id: string;
  slug: string;
  name: string;
  venue: string | null;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  is_test: boolean;
  listings: number;
  looking: number;
  locked_in: number;
};

export type OwnerStats = {
  listings: number;
  looking: number;
  matched: number;
  paused: number;
  with_ticket: number;
  verified: number;
  without_ticket: number;
  hidden: number;
  locked_in: number;
};

export type OwnerMember = {
  entry_id: string;
  user_id: string;
  first_name: string;
  age: number;
  photo_path: string | null;
  category_name: string | null;
  has_ticket: boolean;
  ticket_verified: boolean;
  situation: string;
  status: string;
  listed_at: string;
  hidden: boolean;
  hidden_reason: string | null;
};

export type OwnerLockin = {
  lockin_id: string;
  category_name: string | null;
  team_name: string | null;
  proposer_full_name: string | null;
  partner_full_name: string | null;
  confirmed_at: string;
};

/**
 * Event owner screens: the organisers this person runs (site admins run
 * every organiser). Anyone else gets the "Wrong account" page. The database
 * checks again.
 */
export async function requireOwner() {
  const ctx = await getOwner();
  if (ctx.organisers.length === 0) redirect("/wrong-account?for=organiser");
  return ctx;
}

/**
 * The signed-in person and the organisers they run (maybe none). No racer
 * profile is needed: event owners can use the console without one.
 */
export async function getOwner() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_organisers");
  const organisers = (data as OwnerOrganiser[] | null) ?? [];
  return { user, supabase, organisers };
}

/** One event the person runs, with its organiser, or "not found". */
export async function requireOwnedEvent(eventId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const ctx = await requireOwner();
  const { data } = await ctx.supabase
    .from("events")
    .select("id, organiser_id, slug, name, venue, starts_on, ends_on, ticket_url, name_change_cutoff, is_active, is_test")
    .eq("id", eventId)
    .maybeSingle();
  const organiser = ctx.organisers.find((o) => o.id === data?.organiser_id);
  if (!data || !organiser) notFound();
  return { ...ctx, organiser, event: data as {
    id: string;
    organiser_id: string;
    slug: string;
    name: string;
    venue: string | null;
    starts_on: string;
    ends_on: string;
    ticket_url: string | null;
    name_change_cutoff: string | null;
    is_active: boolean;
    is_test: boolean;
  } };
}

/** What a listing is looking for, in words. */
export function situationLabel(s: string) {
  return { spare_spot: "Has a spare spot", need_spot: "Needs a spot", single: "Single, wants a single" }[s] ?? s;
}
