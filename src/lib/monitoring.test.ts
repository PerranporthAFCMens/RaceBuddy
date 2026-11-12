import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEnvelope, envelopeUrl, parseStack, scrubUrl } from "./monitoring.ts";

test("scrubUrl drops query and hash", () => {
  assert.equal(scrubUrl("/auth/confirm?token_hash=abc&type=email"), "/auth/confirm");
  assert.equal(scrubUrl("https://x.app/chats/1#bottom"), "https://x.app/chats/1");
  assert.equal(scrubUrl("/browse"), "/browse");
});

test("envelopeUrl points at the EU project", () => {
  const url = envelopeUrl("https://key123@o1.ingest.de.sentry.io/42");
  assert.equal(url, "https://o1.ingest.de.sentry.io/api/42/envelope/?sentry_version=7&sentry_key=key123");
});

test("parseStack reads V8 frames, oldest first", () => {
  const stack = [
    "Error: boom",
    "    at inner (/var/task/.next/server/app/page.js:10:5)",
    "    at async outer (/var/task/node_modules/next/dist/x.js:3:1)",
    "    at /var/task/.next/server/chunk.js:7:9",
  ].join("\n");
  const frames = parseStack(stack);
  assert.equal(frames.length, 3);
  assert.equal(frames[2].function, "inner");
  assert.equal(frames[2].lineno, 10);
  assert.equal(frames[2].in_app, true);
  assert.equal(frames[1].in_app, false);
  assert.equal(frames[0].function, "<anonymous>");
});

test("buildEnvelope has header, item and a scrubbed event", () => {
  const err = Object.assign(new Error("db down"), { digest: "123" });
  const [header, item, body] = buildEnvelope(err, {
    path: "/auth/confirm?token_hash=secret",
    method: "GET",
    routePath: "/auth/confirm",
    routeType: "route",
  }).split("\n");
  const event = JSON.parse(body);
  assert.equal(JSON.parse(header).event_id, event.event_id);
  assert.deepEqual(JSON.parse(item), { type: "event" });
  assert.equal(event.request.url, "/auth/confirm");
  assert.ok(!body.includes("secret"));
  assert.equal(event.exception.values[0].value, "db down");
  assert.equal(event.tags.digest, "123");
});
