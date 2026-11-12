import { test } from "node:test";
import assert from "node:assert/strict";
import { siteEnv, siteUrl } from "./site-env.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("uses NEXT_PUBLIC_SITE_ENV when it is set", () => {
  withEnv({ NEXT_PUBLIC_SITE_ENV: "dev", VERCEL_ENV: "production" }, () => assert.equal(siteEnv(), "dev"));
  withEnv({ NEXT_PUBLIC_SITE_ENV: "live", VERCEL_ENV: undefined }, () => assert.equal(siteEnv(), "live"));
});

test("a Vercel production build with no setting counts as live", () => {
  withEnv({ NEXT_PUBLIC_SITE_ENV: undefined, VERCEL_ENV: "production" }, () => assert.equal(siteEnv(), "live"));
});

test("anything else is local, and junk values are ignored", () => {
  withEnv({ NEXT_PUBLIC_SITE_ENV: undefined, VERCEL_ENV: undefined }, () => assert.equal(siteEnv(), "local"));
  withEnv({ NEXT_PUBLIC_SITE_ENV: "staging", VERCEL_ENV: "preview" }, () => assert.equal(siteEnv(), "local"));
});

test("site address comes from NEXT_PUBLIC_SITE_URL, without a trailing slash", () => {
  withEnv({ NEXT_PUBLIC_SITE_URL: "https://example.app/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }, () =>
    assert.equal(siteUrl(), "https://example.app"),
  );
  withEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }, () => assert.equal(siteUrl(), "https://x.vercel.app"));
  withEnv({ NEXT_PUBLIC_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: undefined }, () => assert.equal(siteUrl("http://localhost:3000/"), "http://localhost:3000"));
});
