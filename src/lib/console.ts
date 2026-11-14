/** Shared helpers for the site admin and event owner consoles. */

/** A database refusal shown to the person, or a general message if it's long or technical. */
export function dbError(error: { message: string }) {
  const m = error.message;
  return m.length < 160 && !/violates|syntax|function|relation|column/i.test(m) ? m : "Couldn't save that. Please try again.";
}

/** "" or a missing value becomes null, for optional form fields. */
export function optional(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

/** A yyyy-mm-dd date from a form, or null. */
export function formDate(value: FormDataEntryValue | null): string | null {
  const s = optional(value);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** "12 Mar 2027" or "26 to 27 Mar 2027". */
export function dateRange(starts: string, ends: string) {
  const f = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
  if (starts === ends) return f(starts, { day: "numeric", month: "short", year: "numeric" });
  return `${f(starts, { day: "numeric", month: "short" })} to ${f(ends, { day: "numeric", month: "short", year: "numeric" })}`;
}
