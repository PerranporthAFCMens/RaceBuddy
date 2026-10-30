import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLive } from "@/lib/site-env";
import type { Category, Entry, EventRow, Profile } from "@/lib/types";

/** The signed-in user's id and email, checked against Supabase's signing keys. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub as string, email: (claims.email as string | undefined) ?? null };
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

/** For screens that need a finished profile: sends new people to set one up. */
export async function requireProfile() {
  const user = await requireUser();
  const profile = await getMyProfile();
  if (!profile) redirect("/me?welcome=1");
  return { user, profile };
}

export const getEvents = cache(async (): Promise<EventRow[]> => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("events")
    .select("id, slug, name, venue, starts_on, ends_on, ticket_url, name_change_cutoff, organiser:organisers(name, website_url)")
    .gte("ends_on", today)
    .order("starts_on");
  // The test race (is_test) is for trying things out: shown on the dev site
  // and locally, never on the live site. See ENVIRONMENT.md.
  query = isLive() ? query.eq("is_active", true).eq("is_test", false) : query.or("is_active.eq.true,is_test.eq.true");
  const { data } = await query;
  return (data as unknown as EventRow[]) ?? [];
});

export const getCategories = cache(async (eventId: string): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").eq("event_id", eventId).order("sort_order");
  return (data as Category[]) ?? [];
});

export const getMyEntries = cache(async (): Promise<Entry[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("*").eq("user_id", user.id);
  return (data as Entry[]) ?? [];
});

/** Picks the event from ?event=slug, else one the user has a listing for, else the next one. */
export async function pickEvent(slug: string | undefined) {
  const events = await getEvents();
  if (slug) {
    const match = events.find((e) => e.slug === slug);
    if (match) return { event: match, events };
  }
  const entries = await getMyEntries();
  const mine = events.find((e) => entries.some((en) => en.event_id === e.id));
  return { event: mine ?? events[0] ?? null, events };
}
