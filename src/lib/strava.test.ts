import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseStravaUrl } from "./strava.ts";

test("Strava links are tidied into one form", () => {
  assert.equal(normaliseStravaUrl("https://www.strava.com/athletes/12345"), "https://www.strava.com/athletes/12345");
  assert.equal(normaliseStravaUrl("strava.com/athletes/12345"), "https://www.strava.com/athletes/12345");
  assert.equal(normaliseStravaUrl(" http://www.strava.com/athletes/12345/?ref=share "), "https://www.strava.com/athletes/12345");
  assert.equal(normaliseStravaUrl("https://m.strava.com/athletes/9"), "https://www.strava.com/athletes/9");
  assert.equal(normaliseStravaUrl("https://strava.app.link/AbC123"), "https://strava.app.link/AbC123");
  assert.equal(normaliseStravaUrl(""), null);
  assert.equal(normaliseStravaUrl(null), null);
});

test("anything else is refused", () => {
  assert.equal(normaliseStravaUrl("https://www.strava.com/activities/123"), undefined);
  assert.equal(normaliseStravaUrl("https://evil.example/athletes/123"), undefined);
  assert.equal(normaliseStravaUrl("https://strava.com.evil.example/athletes/1"), undefined);
  assert.equal(normaliseStravaUrl("javascript:alert(1)"), undefined);
  assert.equal(normaliseStravaUrl("my strava is adam"), undefined);
});
