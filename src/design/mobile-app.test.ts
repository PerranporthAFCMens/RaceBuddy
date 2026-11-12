import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { brand } from "./brand.ts";

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
