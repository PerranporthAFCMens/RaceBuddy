import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAdminReportEmail, buildOrganiserReportEmail } from "./email.ts";

const base = { site: "https://example.test", createdAt: "2026-11-14T10:00:00Z" };

test("admin email links straight to the report and says how urgent it is", () => {
  const e = buildAdminReportEmail({
    ...base,
    reportId: "abc",
    category: "Threats or violence",
    priority: "urgent",
    reportedName: "Sam",
    eventNames: ["Test Race"],
  });
  assert.match(e.subject, /^Urgent report/);
  assert.ok(e.text.includes("https://example.test/admin/reports/abc"));
  assert.ok(e.html.includes("https://example.test/admin/reports/abc"));
  assert.ok(e.text.includes("Sam"));
});

test("organiser email names the race but no people, and escapes HTML", () => {
  const e = buildOrganiserReportEmail({ ...base, eventName: "Race <b>X</b>" });
  assert.ok(e.text.includes("Race <b>X</b>"));
  assert.ok(e.html.includes("Race &lt;b&gt;X&lt;/b&gt;"));
  assert.ok(!e.html.includes("<b>X</b>"));
  assert.ok(!/report(ed)? by|Sam/i.test(e.text));
});
