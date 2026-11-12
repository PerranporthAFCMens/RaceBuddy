/** Report reasons. The values match `reports.category` in the database. */
export const REPORT_CATEGORIES = [
  { value: "threat", label: "Threats or violence" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "underage", label: "Might be under 18" },
  { value: "inappropriate_profile", label: "Inappropriate or misleading profile" },
  { value: "spam_scam", label: "Spam or scam" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "other", label: "Something else" },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];

export function isReportCategory(value: unknown): value is ReportCategory {
  return REPORT_CATEGORIES.some((c) => c.value === value);
}

export function reportCategoryLabel(value: string): string {
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? "Something else";
}

/** The database's wording when a suspended or banned person tries to act. */
export function isSuspendedError(message: string | undefined): boolean {
  return Boolean(message && /account is suspended/i.test(message));
}

export const SUSPENDED_TEXT = "Your account is suspended, so you can't do that right now.";

/** Where "Block" may send you afterwards. */
export function safeBlockRedirect(value: unknown): "/chats" | "/browse" {
  return value === "/browse" ? "/browse" : "/chats";
}
