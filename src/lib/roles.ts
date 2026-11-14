import "server-only";
import { cache } from "react";
import { getMyProfile, getUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

/** The areas of the site, one per role. */
export type Area = "admin" | "organiser" | "racer";

export type Roles = {
  email: string | null;
  isAdmin: boolean;
  /** Runs at least one organiser (site admins count, as they can open every one). */
  isOrganiser: boolean;
  /** Has a racer profile, so the racer app works for them. */
  isRacer: boolean;
};

/** What the signed-in person can open. Null when signed out. */
export const getRoles = cache(async (): Promise<Roles | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: isAdmin }, { data: runs }, profile] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("my_organisers"),
    getMyProfile(),
  ]);
  return {
    email: user.email,
    isAdmin: isAdmin === true,
    isOrganiser: ((runs as unknown[] | null) ?? []).length > 0,
    isRacer: Boolean(profile),
  };
});

export const AREA_HOME: Record<Area, string> = { admin: "/admin", organiser: "/organiser", racer: "/browse" };

/** Where someone's "home" is: the admin console, their events, or Browse. */
export function homeFor(roles: Roles | null): string {
  if (roles?.isAdmin) return AREA_HOME.admin;
  if (roles?.isOrganiser) return AREA_HOME.organiser;
  return AREA_HOME.racer;
}

/** The areas this person can switch between, in menu order. */
export function areasFor(roles: Roles): { area: Area; label: string; href: string }[] {
  const out: { area: Area; label: string; href: string }[] = [];
  if (roles.isAdmin) out.push({ area: "admin", label: "Admin console", href: AREA_HOME.admin });
  if (roles.isOrganiser) out.push({ area: "organiser", label: "Organiser view", href: AREA_HOME.organiser });
  if (roles.isRacer) out.push({ area: "racer", label: "Racer app", href: AREA_HOME.racer });
  return out;
}
