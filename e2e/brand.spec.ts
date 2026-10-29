import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { colors } from "../src/design/tokens.ts";

/** Screens anyone can open without signing in, plus the styleguide. */
const SCREENS = [
  { name: "home", path: "/", heading: "Lost your partner? Find a new one." },
  { name: "sign-in", path: "/login", heading: "Welcome back" },
  { name: "join", path: "/login?mode=signup", heading: "Find your partner" },
  { name: "privacy", path: "/privacy", heading: "Privacy" },
  { name: "styleguide", path: "/styleguide", heading: "Styleguide" },
];

const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};
const PALETTE = new Set(Object.values(colors).map(toRgb));

type Finding = { el: string; prop: string; value: string };

/** Walks every visible element and reports styles that are off-brand. */
async function auditStyles(page: Page): Promise<Finding[]> {
  return page.evaluate((palette) => {
    const allowed = new Set(palette);
    const out: { el: string; prop: string; value: string }[] = [];
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 4).join(".")}` : ""}`;
    // "rgb(1, 2, 3)" or "rgba(1, 2, 3, 0.5)" -> "1, 2, 3" (alpha tints of a token are fine).
    const base = (v: string) => v.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
    const checkColour = (el: Element, prop: string, value: string) => {
      const m = base(value);
      if (!m) return out.push({ el: describe(el), prop, value });
      if (m[4] === "0") return; // transparent
      if (!allowed.has(`${m[1]}, ${m[2]}, ${m[3]}`)) out.push({ el: describe(el), prop, value });
    };

    for (const el of document.body.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (s.display === "none" || s.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
      if (["svg", "path", "circle", "rect", "line", "polyline", "g", "img", "option"].includes(el.tagName.toLowerCase())) continue;
      const native = el.matches("input[type=checkbox], input[type=radio]");

      const hasText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      if (hasText) checkColour(el, "color", s.color);
      checkColour(el, "background-color", s.backgroundColor);
      for (const side of ["top", "right", "bottom", "left"] as const) {
        const width = parseFloat(s.getPropertyValue(`border-${side}-width`));
        if (width > 0 && s.getPropertyValue(`border-${side}-style`) !== "none" && !native)
          checkColour(el, `border-${side}-color`, s.getPropertyValue(`border-${side}-color`));
      }

      if (hasText && !/Open Sans|Anton/.test(s.fontFamily)) out.push({ el: describe(el), prop: "font-family", value: s.fontFamily });
      if (hasText && !["400", "600", "700"].includes(s.fontWeight))
        out.push({ el: describe(el), prop: "font-weight", value: s.fontWeight });

      // Square corners. Only small round status dots may be rounded.
      const radius = parseFloat(s.borderTopLeftRadius) || 0;
      if (radius > 0 && !native && !(box.width <= 16 && box.height <= 16))
        out.push({ el: describe(el), prop: "border-radius", value: s.borderTopLeftRadius });

      if (s.boxShadow !== "none") out.push({ el: describe(el), prop: "box-shadow", value: s.boxShadow });
    }
    return out;
  }, [...PALETTE]);
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(screen.path);
      await page.evaluate(() => document.fonts.ready);
    });

    test("loads and shows its heading", async ({ page }) => {
      await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
    });

    test("uses only brand colours, fonts, square corners and no shadows", async ({ page }) => {
      expect(await auditStyles(page)).toEqual([]);
    });

    test("passes automated accessibility checks, including contrast", async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(summary).toEqual([]);
    });

    test("tap targets are at least 44px tall", async ({ page }) => {
      const small = await page.$$eval("main a.btn-gold, main a.btn-white, main a.btn-line, main button, main input:not([type=checkbox]):not([type=radio]):not([type=hidden]), main select", (els) =>
        els
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => ({ text: (el.textContent || el.getAttribute("name") || el.tagName).trim(), h: el.getBoundingClientRect().height }))
          .filter((x) => x.h < 43.5),
      );
      expect(small).toEqual([]);
    });

    test("matches the approved screenshot", async ({ page }) => {
      await expect(page).toHaveScreenshot(`${screen.name}.png`, { fullPage: true });
    });
  });
}
