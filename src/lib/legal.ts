import { brand } from "@/design/brand";

/**
 * Terms of Use version. Change it whenever the Terms change in a way people
 * must agree to again: everyone is then asked to accept the new version.
 */
export const TERMS_VERSION = "2026-11-12";

/**
 * Who runs the service: the Terms and Privacy pages say "<OPERATOR>, trading as <product name>".
 * Set by the owner. null = the Terms just say the product name.
 */
export const OPERATOR: string | null = "Adam Turner";

/** Most we will pay for any claim under the Terms (free service), in pounds. */
export const LIABILITY_CAP_GBP = 50;

/**
 * Where people can email about safety, complaints and their data. A business
 * address only (the repo is public). Set to null to fall back to pointing
 * people at the in-app Report buttons.
 */
export const SAFETY_EMAIL: string | null = `hello@${brand.domain}`;
