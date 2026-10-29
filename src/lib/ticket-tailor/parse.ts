// Turns Ticket Tailor ticket type names into Race Buddy categories.
// Pure functions with no imports, so scripts can use them too.

export type ParsedCategory = {
  name: string;
  division: "doubles" | "pro" | "adaptive" | "relay";
  gender: "male" | "female" | "mixed";
  race_day: string | null;
  team_size: 2 | 4;
};

/** Ticket types that are not adult race entries (spectators, transfers, juniors). */
export function isAdultRaceTicket(name: string): boolean {
  const n = name.toLowerCase();
  if (/spectator|transfer|name change|nex ?gen|foundation|under 1[0-9]/.test(n)) return false;
  return /doubles|relay|adaptive|pro/.test(n);
}

export function parseTicketType(name: string): ParsedCategory | null {
  if (!isAdultRaceTicket(name)) return null;
  const n = name.toLowerCase();
  const gender: ParsedCategory["gender"] = /mixed/.test(n)
    ? "mixed"
    : /female|women/.test(n)
      ? "female"
      : /male|men/.test(n)
        ? "male"
        : "mixed";
  const division: ParsedCategory["division"] = /relay/.test(n)
    ? "relay"
    : /adaptive/.test(n)
      ? "adaptive"
      : /\bpro\b/.test(n)
        ? "pro"
        : "doubles";
  const dayMatch = name.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)( Evening| Morning| Afternoon)?/i);
  const race_day = dayMatch ? dayMatch[0].replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const genderLabel = { male: "Male", female: "Female", mixed: "Mixed" }[gender];
  const label =
    division === "relay"
      ? `${genderLabel} Relay`
      : division === "pro"
        ? `${genderLabel} Pro Doubles`
        : division === "adaptive"
          ? `Adaptive ${genderLabel} Doubles`
          : `${genderLabel} Doubles`;
  return { name: label, division, gender, race_day, team_size: division === "relay" ? 4 : 2 };
}

/** Accepts "or_12345678", "OR-12345678", "#12345678" or "12345678". Returns "or_12345678" or null. */
export function normaliseOrderReference(input: string): string | null {
  const digits = input.trim().replace(/^#/, "").replace(/^or[_\-\s]?/i, "");
  return /^\d{4,12}$/.test(digits) ? `or_${digits}` : null;
}
