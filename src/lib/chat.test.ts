import assert from "node:assert/strict";
import { test } from "node:test";
import { dayLabel, findLinks, layoutMessages, seenBy, snippet, summariseReactions, timeLabel } from "./chat.ts";

test("times are UK 24-hour", () => {
  assert.equal(timeLabel("2026-11-04T18:42:00Z"), "18:42");
  assert.equal(timeLabel("2026-07-04T18:42:00Z"), "19:42"); // British Summer Time
});

test("day labels", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  assert.equal(dayLabel("2026-11-04T08:00:00Z", now), "Today");
  assert.equal(dayLabel("2026-11-03T22:00:00Z", now), "Yesterday");
  assert.equal(dayLabel("2026-11-02T10:00:00Z", now), "Mon 2 Nov");
  assert.equal(dayLabel("2025-11-02T10:00:00Z", now), "Sun 2 Nov 2025");
});

test("messages group by person, day and a 5 minute gap", () => {
  const m = (id: string, sender_id: string, created_at: string) => ({ id, sender_id, created_at });
  const rows = layoutMessages(
    [
      m("a", "tom", "2026-11-03T20:00:00Z"),
      m("b", "tom", "2026-11-04T09:00:00Z"),
      m("c", "tom", "2026-11-04T09:03:00Z"),
      m("d", "jess", "2026-11-04T09:04:00Z"),
      m("e", "jess", "2026-11-04T09:20:00Z"),
    ],
    new Date("2026-11-04T12:00:00Z"),
  );
  assert.deepEqual(
    rows.map((r) => (r.kind === "day" ? r.label : `${r.key}${r.first ? "<" : ""}${r.last ? ">" : ""}`)),
    ["Yesterday", "a<>", "Today", "b<", "c>", "d<>", "e<>"],
  );
});

test("links: only web links, tidied, at most three", () => {
  assert.deepEqual(findLinks("See https://www.keltx.co.uk/events. Or javascript:alert(1)"), [
    { href: "https://www.keltx.co.uk/events", label: "keltx.co.uk" },
  ]);
  assert.deepEqual(findLinks("no links here"), []);
  assert.equal(findLinks("http://a.com http://b.com http://c.com http://d.com").length, 3);
});

test("reactions count per emoji in picker order and know which are yours", () => {
  const rows = [
    { id: "1", message_id: "m", user_id: "jess", emoji: "🔥" },
    { id: "2", message_id: "m", user_id: "me", emoji: "👍" },
    { id: "3", message_id: "m", user_id: "jess", emoji: "👍" },
  ];
  assert.deepEqual(
    summariseReactions(rows, "me").map((r) => [r.emoji, r.count, r.mine]),
    [
      ["👍", 2, true],
      ["🔥", 1, false],
    ],
  );
});

test("snippets and seen", () => {
  assert.equal(snippet("  hello\n  there "), "hello there");
  assert.equal(snippet("x".repeat(100), 10), `${"x".repeat(9)}…`);
  const others = [
    { user_id: "tom", last_read_at: "2026-11-04T10:00:00Z" },
    { user_id: "jess", last_read_at: "2026-11-04T08:00:00Z" },
  ];
  assert.deepEqual(seenBy("2026-11-04T09:00:00Z", others), ["tom"]);
});
