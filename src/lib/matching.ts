import { formatRaceTime } from "./format.ts";

export type Situation = "spare_spot" | "need_spot" | "single";

export const SITUATIONS: { value: Situation; letter: string; title: string; sub: string }[] = [
  {
    value: "spare_spot",
    letter: "A",
    title: "I have a spare spot",
    sub: "I've got a ticket and my partner or teammate dropped out",
  },
  { value: "need_spot", letter: "B", title: "I need a spot on a team", sub: "No ticket. Put me in someone's team" },
  {
    value: "single",
    letter: "C",
    title: "I'm a single, find me a single",
    sub: "No ticket. Find another single and enter together",
  },
];

export function isSituation(v: unknown): v is Situation {
  return v === "spare_spot" || v === "need_spot" || v === "single";
}

/** Partner 5km ranges people can pick, in seconds. Null means any. */
export const FIVE_K_RANGES: { value: number | null; label: string }[] = [
  { value: null, label: "Any" },
  { value: 60, label: "±1 min" },
  { value: 120, label: "±2 min" },
  { value: 240, label: "±4 min" },
];

/** What someone is after, as shown on their card. */
export function situationLabel(e: {
  situation: Situation;
  has_ticket: boolean;
  team_size: number | null;
  spots_needed: number;
}): string {
  if (e.situation === "spare_spot") {
    return e.team_size === 4 ? `Team needs ${e.spots_needed} of 4` : "Has a spare spot";
  }
  return e.situation === "single" ? "Single, wants a single" : "Needs a spot";
}

type Side = {
  has_ticket: boolean;
  category_id: string | null;
  wanted_category_ids: string[];
  five_k_seconds: number | null;
  region: string | null;
};

export function categoriesOf(e: Pick<Side, "has_ticket" | "category_id" | "wanted_category_ids">): string[] {
  return e.has_ticket ? (e.category_id ? [e.category_id] : []) : e.wanted_category_ids;
}

/**
 * Short reasons why `other` suits `me`, for the "For you" list. The database
 * decides who matches; this only explains it.
 */
export function fitReasons(
  me: Side,
  other: Side,
  categoryLabel: (id: string) => string | undefined,
): string[] {
  const reasons: string[] = [];
  const mine = new Set(categoriesOf(me));
  const shared = categoriesOf(other).filter((id) => mine.has(id));
  const first = shared[0] ? categoryLabel(shared[0]) : undefined;
  if (first) reasons.push(shared.length > 1 ? `${first} +${shared.length - 1}` : first);
  if (me.five_k_seconds != null && other.five_k_seconds != null) {
    const diff = Math.abs(me.five_k_seconds - other.five_k_seconds);
    reasons.push(diff < 30 ? `5km ${formatRaceTime(other.five_k_seconds)}, same as you` : `5km ${formatRaceTime(other.five_k_seconds)}`);
  }
  if (other.region) reasons.push(me.region && me.region === other.region ? `Also in ${other.region}` : other.region);
  return reasons;
}
