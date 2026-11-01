import { supabaseBaseUrl } from "./supabase/url.ts";

/** "22:40" or "22.40" or "1360" (seconds) -> seconds. Returns null if empty, NaN if unreadable. */
export function parseRaceTime(input: string | null | undefined): number | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  const parts = value.split(/[:.]/).map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return Number.NaN;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return Number.NaN;
}

export function formatRaceTime(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Seconds -> hours, minutes and seconds, for filling in separate boxes. */
export function splitDuration(seconds: number | null | undefined): { h: string; m: string; s: string } {
  if (seconds == null || Number.isNaN(seconds)) return { h: "", m: "", s: "" };
  return {
    h: String(Math.floor(seconds / 3600)),
    m: String(Math.floor((seconds % 3600) / 60)),
    s: String(seconds % 60).padStart(2, "0"),
  };
}

/** Seconds -> "1:21:12". */
export function formatDuration(seconds: number): string {
  const { h, m, s } = splitDuration(seconds);
  return `${h}:${m.padStart(2, "0")}:${s}`;
}

/**
 * Reads a saved previous race time back into seconds. Older profiles typed it
 * freely ("Cornwall 1:21:12", "1:23"), so take the last time in the text and
 * read two parts as hours and minutes. Null if there isn't one.
 */
export function parseFinishTime(text: string | null | undefined): number | null {
  const match = (text ?? "").match(/(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?(?!.*\d[:.]\d)/);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s ?? 0);
}

/**
 * Hours, minutes and seconds typed in separate boxes -> total seconds.
 * Null if every box is empty, NaN if a box isn't a whole number or minutes or
 * seconds are 60 or more.
 */
export function durationFromParts(parts: { h?: string; m?: string; s?: string }): number | null {
  const values = [parts.h, parts.m, parts.s].map((v) => (v ?? "").trim());
  if (values.every((v) => v === "")) return null;
  if (values.some((v) => v !== "" && !/^\d{1,2}$/.test(v))) return Number.NaN;
  const [h, m, s] = values.map((v) => Number(v || 0));
  if (m > 59 || s > 59) return Number.NaN;
  return h * 3600 + m * 60 + s;
}

export function ageOn(dateOfBirth: string, on = new Date()): number {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < dob.getUTCMonth() ||
    (on.getUTCMonth() === dob.getUTCMonth() && on.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function formatEventDates(startsOn: string, endsOn: string): string {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
  if (startsOn === endsOn) return fmt(startsOn, { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(startsOn, { day: "numeric" })}–${fmt(endsOn, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${supabaseBaseUrl(base)}/storage/v1/object/public/avatars/${path}`;
}

export const REGIONS = [
  "Cornwall",
  "Devon",
  "Somerset",
  "Dorset",
  "Bristol & Gloucestershire",
  "Wiltshire",
  "Wales",
  "South East",
  "Midlands",
  "North",
  "Scotland",
  "Elsewhere",
] as const;

export function categoryLabel(c: { name: string; race_day: string | null }) {
  return c.race_day ? `${c.name} · ${c.race_day}` : c.name;
}
