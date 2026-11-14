import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrganiserInviteEmail } from "./email.ts";

const base = { site: "https://example.test", organiserName: "Race Co <Events>", link: "https://example.test/auth/confirm?x=1&y=2" };

test("a new organiser is asked to set a password, with the sign-in link", () => {
  const e = buildOrganiserInviteEmail({ ...base, isNew: true });
  assert.match(e.subject, /Race Co <Events>/);
  assert.match(e.text, /set your password/i);
  assert.ok(e.text.includes(base.link));
  assert.ok(e.html.includes("https://example.test/auth/confirm?x=1&amp;y=2"));
});

test("an existing account just signs in, and the organiser name is escaped", () => {
  const e = buildOrganiserInviteEmail({ ...base, isNew: false });
  assert.match(e.text, /Open the organiser view/);
  assert.ok(!/set your password/i.test(e.text));
  assert.ok(e.html.includes("Race Co &lt;Events&gt;"));
  assert.ok(!e.html.includes("<Events>"));
});

test("says what organisers can and can't see", () => {
  const e = buildOrganiserInviteEmail({ ...base, isNew: true });
  assert.match(e.text, /at risk/);
  assert.match(e.text, /never see racers' chats/);
});
