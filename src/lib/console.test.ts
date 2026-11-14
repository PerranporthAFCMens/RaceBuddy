import assert from "node:assert/strict";
import test from "node:test";
import { dateRange, dbError, formDate, optional } from "./console.ts";

test("database refusals are shown, technical errors are not", () => {
  assert.equal(dbError({ message: "The ticket link must start with https://" }), "The ticket link must start with https://");
  assert.equal(dbError({ message: 'duplicate key value violates unique constraint "x"' }), "Couldn't save that. Please try again.");
});

test("optional fields and dates from forms", () => {
  assert.equal(optional("  "), null);
  assert.equal(optional(" a "), "a");
  assert.equal(formDate("2027-03-26"), "2027-03-26");
  assert.equal(formDate("26/03/2027"), null);
});

test("event dates read naturally", () => {
  assert.equal(dateRange("2027-03-26", "2027-03-27"), "26 Mar to 27 Mar 2027");
  assert.equal(dateRange("2027-03-26", "2027-03-26"), "26 Mar 2027");
});
