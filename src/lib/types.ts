import type { Situation } from "./matching";

// Shapes of the rows the app reads. Kept by hand for now; once the Supabase
// project exists these can be generated with `supabase gen types`.

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  venue: string | null;
  starts_on: string;
  ends_on: string;
  ticket_url: string | null;
  name_change_cutoff: string | null;
  organiser: { name: string; website_url: string | null; theme?: unknown } | null;
};

export type Category = {
  id: string;
  event_id: string;
  name: string;
  division: "doubles" | "pro" | "adaptive" | "relay";
  gender: "male" | "female" | "mixed";
  race_day: string | null;
  team_size: 2 | 4;
  tt_ticket_type_id: string | null;
  sort_order: number;
};

export type Profile = {
  /** Added by migration 20261101230000_strava_link; optional until it has run. */
  strava_url?: string | null;
  /** Added by migration 20261104180000_results_link; optional until it has run. */
  results_url?: string | null;
  id: string;
  first_name: string;
  date_of_birth: string;
  photo_path: string | null;
  bio: string | null;
  gym: string | null;
  home_town: string | null;
  region: string | null;
  travel_miles: number | null;
  five_k_seconds: number | null;
  best_race_time: string | null;
  /** Added by migration 20261112120000_safety. Null until the person accepts the Terms. */
  terms_version?: string | null;
  terms_accepted_at?: string | null;
};

export type Entry = {
  id: string;
  user_id: string;
  event_id: string;
  has_ticket: boolean;
  category_id: string | null;
  wanted_category_ids: string[];
  team_name: string | null;
  spots_needed: number;
  stations: string | null;
  race_days: string[];
  note: string | null;
  order_reference: string | null;
  ticket_verified: boolean;
  status: "looking" | "matched" | "paused";
  situation: Situation;
  partner_five_k_range: number | null;
  partner_regions: string[];
  alerts_email: boolean;
};

/** A row of the feed_entries view: a listing plus the safe profile fields. */
export type FeedEntry = {
  id: string;
  event_id: string;
  user_id: string;
  has_ticket: boolean;
  ticket_verified: boolean;
  category_id: string | null;
  category_name: string | null;
  division: Category["division"] | null;
  gender: Category["gender"] | null;
  team_size: number | null;
  race_day: string | null;
  wanted_category_ids: string[];
  team_name: string | null;
  spots_needed: number;
  stations: string | null;
  race_days: string[];
  note: string | null;
  status: Entry["status"];
  created_at: string;
  first_name: string;
  age: number;
  photo_path: string | null;
  gym: string | null;
  home_town: string | null;
  region: string | null;
  travel_miles: number | null;
  five_k_seconds: number | null;
  best_race_time: string | null;
  situation: Situation;
};

export type AthleteProfile = {
  /** Added by migration 20261101230000_strava_link; optional until it has run. */
  strava_url?: string | null;
  /** Added by migration 20261104180000_results_link; optional until it has run. */
  results_url?: string | null;
  id: string;
  first_name: string;
  age: number;
  photo_path: string | null;
  bio: string | null;
  gym: string | null;
  home_town: string | null;
  region: string | null;
  travel_miles: number | null;
  five_k_seconds: number | null;
  best_race_time: string | null;
};

export type PartnerRequest = {
  id: string;
  event_id: string;
  from_user: string;
  to_user: string;
  from_entry_id: string | null;
  to_entry_id: string;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  conversation_id: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** The message this one answers, if any (added 2026-11-04; may be missing before that migration runs). */
  reply_to_id?: string | null;
};

export type Lockin = {
  id: string;
  conversation_id: string;
  anchor_entry_id: string;
  proposer_id: string;
  partner_id: string;
  status: "proposed" | "confirmed" | "declined" | "cancelled";
  created_at: string;
};

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;
