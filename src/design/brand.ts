/**
 * Product name. The name is under review, so everything that shows it (pages,
 * page titles, the home-screen label, emails, error messages) reads from here.
 *
 * To rename the app, change `name` below. The wordmark and short name follow
 * it automatically. See docs/rename-and-domain.md for the full checklist,
 * including the web address.
 */
const name = "YGIG";

export const brand = {
  name,
  /** Label under the home-screen icon. Keep to about 12 characters. */
  shortName: name,
  /** Wordmark text: the name in capitals with the last letter set in gold. */
  wordmark: { lead: name.toUpperCase().slice(0, -1), accent: name.toUpperCase().slice(-1) },
  tagline: "The partner finder for fitness races",
  description: "Lost your race partner? Find a new one. The partner finder for doubles and relay fitness races.",
} as const;
