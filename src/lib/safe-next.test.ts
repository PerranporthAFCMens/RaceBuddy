import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

test("keeps paths on this site", () => {
  assert.equal(safeNext("/me/race?event=x#alerts"), "/me/race?event=x#alerts");
  assert.equal(safeNext("/"), "/");
});

test("refuses anything that could leave the site", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "\\\\evil.com", "/\t/evil.com", "https://evil.com", "evil.com", "", null, undefined, 5]) {
    assert.equal(safeNext(bad), "/browse", String(bad));
  }
});

test("uses the fallback given", () => {
  assert.equal(safeNext("//x", "/me"), "/me");
});
