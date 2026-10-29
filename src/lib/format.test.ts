import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOn, formatRaceTime, parseRaceTime } from "./format.ts";
import { normaliseOrderReference, parseTicketType } from "./ticket-tailor/parse.ts";

test("race times", () => {
  assert.equal(parseRaceTime("22:40"), 1360);
  assert.equal(parseRaceTime("22.40"), 1360);
  assert.equal(parseRaceTime("1:05:00"), 3900);
  assert.equal(parseRaceTime(""), null);
  assert.ok(Number.isNaN(parseRaceTime("fast")));
  assert.equal(formatRaceTime(1360), "22:40");
  assert.equal(formatRaceTime(605), "10:05");
});

test("age is worked out from the birthday", () => {
  const on = new Date("2026-10-29T12:00:00Z");
  assert.equal(ageOn("2008-10-29", on), 18);
  assert.equal(ageOn("2008-10-30", on), 17);
});

test("Ticket Tailor ticket types become categories", () => {
  assert.deepEqual(parseTicketType("KELTX UK - Mixed Relay Ticket: Friday Evening"), {
    name: "Mixed Relay",
    division: "relay",
    gender: "mixed",
    race_day: "Friday Evening",
    team_size: 4,
  });
  assert.equal(parseTicketType("KELTX UK - Female's Doubles Ticket: Saturday")?.name, "Female Doubles");
  assert.equal(parseTicketType("KELTX UK - Male's Pro Doubles Ticket: Friday")?.name, "Male Pro Doubles");
  assert.equal(
    parseTicketType("KELTX UK - Adaptive Ticket: Mixed Doubles Ticket: Saturday In Collaboration With Pantheon")?.name,
    "Adaptive Mixed Doubles",
  );
  // Juniors, spectators and transfers are not adult race entries.
  assert.equal(parseTicketType("KELTX UK - NeX GEN (Age 12-15) Male Doubles Ticket: Friday"), null);
  assert.equal(parseTicketType("KELTX UK - NeX GEN Foundations (Age 9-11) Mixed Doubles Ticket: Friday"), null);
  assert.equal(parseTicketType("Adult Spectator Ticket"), null);
  assert.equal(parseTicketType("Ticket Transfer / Name Change"), null);
});

test("order references", () => {
  assert.equal(normaliseOrderReference("OR-12345678"), "or_12345678");
  assert.equal(normaliseOrderReference("#12345678"), "or_12345678");
  assert.equal(normaliseOrderReference("or_12345678"), "or_12345678");
  assert.equal(normaliseOrderReference("hello"), null);
});

test("supabaseBaseUrl trims /rest/v1 and trailing slashes", async () => {
  const { supabaseBaseUrl } = await import("./supabase/url.ts");
  assert.equal(supabaseBaseUrl("https://abc.supabase.co/rest/v1/"), "https://abc.supabase.co");
  assert.equal(supabaseBaseUrl("https://abc.supabase.co/rest/v1"), "https://abc.supabase.co");
  assert.equal(supabaseBaseUrl(" https://abc.supabase.co/ "), "https://abc.supabase.co");
  assert.equal(supabaseBaseUrl("https://abc.supabase.co"), "https://abc.supabase.co");
});
