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

/**
 * The site's public address, with no trailing slash. Used in sign-up links,
 * emails and page metadata. Set NEXT_PUBLIC_SITE_URL in each Vercel project:
 * moving to a custom domain is a change to that one setting.
 */
export function siteUrl(fallback = "http://localhost:3000") {
  const set = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (set) return set.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return fallback.replace(/\/+$/, "");
}
