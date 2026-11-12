import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseResultsUrl } from "./results-link.ts";

test("results links are tidied into one form", () => {
  const db = "https://dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029";
  assert.equal(normaliseResultsUrl(db), db);
  assert.equal(normaliseResultsUrl("dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029"), db);
  assert.equal(normaliseResultsUrl(" http://www.dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029#top "), db);
  assert.equal(normaliseResultsUrl("https://results.hyrox.com/season-8/"), "https://results.hyrox.com/season-8/");
  assert.equal(normaliseResultsUrl(""), null);
  assert.equal(normaliseResultsUrl(null), null);
});

test("anything else is refused", () => {
  assert.equal(normaliseResultsUrl("https://evil.example/results.aspx"), undefined);
  assert.equal(normaliseResultsUrl("https://dbmaxresults.co.uk.evil.example/"), undefined);
  assert.equal(normaliseResultsUrl("https://user:pw@dbmaxresults.co.uk/"), undefined);
  assert.equal(normaliseResultsUrl("https://dbmaxresults.co.uk:8443/"), undefined);
  assert.equal(normaliseResultsUrl("javascript:alert(1)"), undefined);
  assert.equal(normaliseResultsUrl("my times are on dbmax"), undefined);
  assert.equal(normaliseResultsUrl(`https://dbmaxresults.co.uk/${"a".repeat(300)}`), undefined);
});
