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
