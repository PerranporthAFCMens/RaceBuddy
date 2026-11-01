import { expect, test } from "@playwright/test";

// Browser security headers on every kind of page, and no way to bounce
// people to another site after signing in.
const pages = ["/", "/login", "/privacy", "/styleguide", "/no-such-page", "/manifest.webmanifest"];

for (const path of pages) {
  test(`security headers on ${path}`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    const h = res.headers();
    const csp = h["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain("unsafe-eval");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });
}

test("pages load with no blocked content", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/.test(m.text())) blocked.push(m.text());
  });
  for (const path of ["/", "/login", "/styleguide"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(blocked).toEqual([]);
});

test("sign-in links cannot send people to another site", async ({ request }) => {
  for (const next of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
    const res = await request.get(`/auth/confirm?next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
    const to = new URL(res.headers()["location"] ?? "", "http://127.0.0.1");
    expect(to.hostname, next).not.toContain("evil");
    expect(to.pathname, next).toBe("/login");
  }
});
