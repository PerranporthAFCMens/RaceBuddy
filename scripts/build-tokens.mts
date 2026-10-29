// Rebuilds src/app/tokens.css from src/design/tokens.ts. `--check` fails if it is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { renderTokensCss } from "../src/design/render-css.ts";

const target = new URL("../src/app/tokens.css", import.meta.url);
const css = renderTokensCss();

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {}
  if (current !== css) {
    console.error("src/app/tokens.css is out of date. Run `npm run tokens` and commit the result.");
    process.exit(1);
  }
  console.log("tokens.css is up to date.");
} else {
  writeFileSync(target, css);
  console.log("Wrote src/app/tokens.css");
}
