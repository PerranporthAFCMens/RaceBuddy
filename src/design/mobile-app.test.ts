import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { brand } from "./brand.ts";
import { colors } from "./tokens.ts";

// The phone app shell keeps its own config file; it must match the brand.
const config = JSON.parse(readFileSync("mobile/capacitor.config.json", "utf8"));

test("phone app name matches the brand", () => {
  assert.equal(config.appName, brand.name);
});

test("phone app opens the live site over https", () => {
  const url = new URL(config.server.url);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, `www.${brand.domain}`);
  assert.ok(config.server.allowNavigation.includes(`www.${brand.domain}`));
});

test("phone app id is built from the domain", () => {
  assert.equal(config.appId, `${brand.domain.split(".").reverse().join(".")}.app`);
});

test("phone app background and offline page use the brand", () => {
  assert.equal(config.backgroundColor, colors.bg);
  assert.equal(config.server.errorPath, "offline.html");
  const offline = readFileSync("mobile/www/offline.html", "utf8");
  for (const c of [colors.bg, colors.fg, colors.accent]) assert.ok(offline.includes(c), `offline page uses ${c}`);
  assert.ok(offline.includes(config.server.url), "Try again opens the app's start page");
});
