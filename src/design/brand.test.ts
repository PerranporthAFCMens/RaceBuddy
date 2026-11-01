import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { brand } from "./brand.ts";

// A rename should be a one-line change in src/design/brand.ts. This fails if
// the name (or its wordmark) is typed straight into any other file.
const root = join(import.meta.dirname, "..");
const self = join(import.meta.dirname, "brand.ts");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return files(p);
    return /\.(tsx?|mts|css|svg|json)$/.test(d.name) && !d.name.endsWith(".test.ts") ? [p] : [];
  });
}

test("the product name is only typed in src/design/brand.ts", () => {
  const needles = [brand.name, brand.wordmark.lead].map((n) => n.toLowerCase());
  const found = files(root)
    .filter((p) => p !== self)
    .filter((p) => needles.some((n) => readFileSync(p, "utf8").toLowerCase().includes(n)))
    .map((p) => relative(root, p));
  assert.deepEqual(found, [], `Use brand.name from src/design/brand.ts instead of typing the name in: ${found.join(", ")}`);
});

test("the wordmark spells the name", () => {
  assert.equal(brand.wordmark.lead + brand.wordmark.accent, brand.name.toUpperCase());
});
