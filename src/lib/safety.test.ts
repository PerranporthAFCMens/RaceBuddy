import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isReportCategory, isSuspendedError, REPORT_CATEGORIES, reportCategoryLabel, safeBlockRedirect } from "./safety.ts";

test("report categories match the database list", () => {
  const sql = readFileSync("supabase/migrations/20261112120000_safety.sql", "utf8");
  const list = sql.match(/category in \(\s*([^)]*)\)/)?.[1] ?? "";
  const db = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(REPORT_CATEGORIES.map((c) => c.value), db);
});

test("report category helpers", () => {
  assert.equal(isReportCategory("threat"), true);
  assert.equal(isReportCategory("nope"), false);
  assert.equal(reportCategoryLabel("underage"), "Might be under 18");
  assert.equal(reportCategoryLabel("nope"), "Something else");
});

test("suspended errors are recognised", () => {
  assert.equal(isSuspendedError("Your account is suspended, so you can't do that right now."), true);
  assert.equal(isSuspendedError("Slow down"), false);
  assert.equal(isSuspendedError(undefined), false);
});

test("block only redirects to known pages", () => {
  assert.equal(safeBlockRedirect("/browse"), "/browse");
  assert.equal(safeBlockRedirect("https://evil.example"), "/chats");
  assert.equal(safeBlockRedirect(null), "/chats");
});
