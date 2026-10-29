import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAlertEmail } from "./alerts/email.ts";
import { fitReasons, isSituation, situationLabel } from "./matching.ts";

test("situation labels", () => {
  assert.equal(situationLabel({ situation: "spare_spot", has_ticket: true, team_size: 2, spots_needed: 1 }), "Has a spare spot");
  assert.equal(situationLabel({ situation: "spare_spot", has_ticket: true, team_size: 4, spots_needed: 2 }), "Team needs 2 of 4");
  assert.equal(situationLabel({ situation: "need_spot", has_ticket: false, team_size: null, spots_needed: 1 }), "Needs a spot");
  assert.equal(situationLabel({ situation: "single", has_ticket: false, team_size: null, spots_needed: 1 }), "Single, wants a single");
  assert.ok(isSituation("single"));
  assert.ok(!isSituation("anything"));
});

test("fit reasons explain a match", () => {
  const me = { has_ticket: true, category_id: "mx-sat", wanted_category_ids: [], five_k_seconds: 1340, region: "Cornwall" };
  const them = { has_ticket: false, category_id: null, wanted_category_ids: ["f-sat", "mx-sat"], five_k_seconds: 1395, region: "Cornwall" };
  const label = (id: string) => ({ "mx-sat": "Mixed Doubles · Saturday" })[id];
  assert.deepEqual(fitReasons(me, them, label), ["Mixed Doubles · Saturday", "5km 23:15", "Also in Cornwall"]);
});

test("alert email names the match and links back", () => {
  const email = buildAlertEmail({
    site: "https://race.example",
    eventName: "KeltX Exeter",
    eventSlug: "keltx-exeter-2027",
    matches: [{ entryId: "e1", firstName: "Sarah", age: 32, what: "Needs a spot", details: "Mixed Doubles · Saturday", note: "<b>Free</b> Saturday" }],
  });
  assert.equal(email.subject, "New match for KeltX Exeter: Sarah needs a spot");
  assert.ok(email.html.includes("https://race.example/athletes/e1"));
  assert.ok(email.html.includes("&lt;b&gt;Free&lt;/b&gt;"), "notes are escaped");
  assert.ok(email.text.includes("Turn them off: https://race.example/me/race?event=keltx-exeter-2027#alerts"));
  const many = buildAlertEmail({
    site: "https://race.example",
    eventName: "KeltX Exeter",
    eventSlug: "x",
    matches: Array.from({ length: 5 }, (_, i) => ({ entryId: `e${i}`, firstName: `A${i}`, age: null, what: "Needs a spot", details: "", note: null })),
  });
  assert.equal(many.subject, "5 new matches for KeltX Exeter");
  assert.ok(many.text.includes("And 2 more"));
});
