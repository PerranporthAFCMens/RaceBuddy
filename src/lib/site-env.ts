/**
 * Which copy of the app this is.
 *
 *   live   the public site (Vercel project "race-buddy", built from main)
 *   dev    the test site (Vercel project "race-buddy-dev", built from dev)
 *   local  a laptop or CI
 *
 * Set NEXT_PUBLIC_SITE_ENV in each Vercel project. If it is missing on a
 * Vercel production build we assume live, so nothing test-only leaks out.
 */
export type SiteEnv = "live" | "dev" | "local";

export function siteEnv(): SiteEnv {
  const set = process.env.NEXT_PUBLIC_SITE_ENV;
  if (set === "live" || set === "dev" || set === "local") return set;
  return process.env.VERCEL_ENV === "production" ? "live" : "local";
}

export const isLive = () => siteEnv() === "live";
export const isDev = () => siteEnv() === "dev";
