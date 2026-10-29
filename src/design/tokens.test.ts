import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { brandProblems } from "../../eslint-rules/brand.mjs";
import { contrastRatio } from "./contrast.ts";
import { renderTokensCss } from "./render-css.ts";
import { colors, contrastPairs } from "./tokens.ts";

const root = new URL("../../", import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), "utf8");
const palette = new Set(Object.values(colors).map((c) => c.toLowerCase()));

function filesUnder(dir: string, ext: string): string[] {
  return readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(ext))
    .map((e) => join(e.parentPath, e.name).slice(root.length));
}

test("every colour pair meets its WCAG contrast target", () => {
  const failures = contrastPairs
    .map((p) => ({ ...p, ratio: contrastRatio(colors[p.fg], colors[p.bg]) }))
    .filter((p) => p.ratio < p.min)
    .map((p) => `${p.fg} on ${p.bg} (${p.use}): ${p.ratio.toFixed(2)}:1, needs ${p.min}:1`);
  assert.deepEqual(failures, []);
});

test("contrast maths matches known WCAG values", () => {
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(1), "21.0");
  assert.equal(contrastRatio("#777777", "#ffffff").toFixed(2), "4.48");
});

test("tokens.css is generated from tokens.ts (run `npm run tokens`)", () => {
  assert.equal(read("src/app/tokens.css"), renderTokensCss());
});

test("stylesheets use tokens, not raw colours or arbitrary values", () => {
  for (const file of filesUnder("src", ".css").filter((f) => !f.endsWith("tokens.css"))) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
    const issues: string[] = [];
    css.split("\n").forEach((line, i) => {
      const applied = line.match(/@apply\s+([^;]+);/)?.[1];
      for (const msg of brandProblems(applied ?? line.replace(/var\(--[\w-]+\)/g, "")) as string[]) {
        if (applied || /colour|Raw/.test(msg)) issues.push(`${file}:${i + 1} ${msg}`);
      }
    });
    assert.deepEqual(issues, [], file);
  }
});

test("brand images only use palette colours", () => {
  for (const file of [...filesUnder("src", ".svg"), ...filesUnder("public", ".svg")]) {
    const hexes = read(file).match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    for (const hex of hexes) {
      const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;
      assert.ok(palette.has(full.toLowerCase()), `${file} uses ${hex}, which is not a brand colour`);
    }
  }
});

test("the lint rule catches off-brand classes and allows layout escapes", () => {
  const bad = ["text-[13px]", "bg-red-500", "text-white", "rounded-lg", "shadow-md", "font-medium", "p-[7px]", "#c09b2f", "rgb(0 0 0)", "hover:tracking-[0.2em]"];
  for (const cls of bad) assert.ok(brandProblems(cls).length > 0, `${cls} should be flagged`);
  const ok = ["bg-accent text-accent-ink", "rounded-full size-2", "pb-[env(safe-area-inset-bottom)]", "max-w-[82%]", "grid-cols-[48px_1fr]", "text-2xs tracking-widest"];
  for (const cls of ok) assert.deepEqual(brandProblems(cls), [], `${cls} should be allowed`);
});
