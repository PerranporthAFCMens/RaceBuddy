// Builds the phone app's icons, splash screens and offline page from the brand
// (src/design/brand.ts and tokens.ts), so they never drift from the website.
// Run: npm run app-assets   (needs Playwright's Chromium and internet for the font)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";
import { brand } from "../src/design/brand.ts";
import { colors } from "../src/design/tokens.ts";

const ios = "mobile/ios/App/App/Assets.xcassets";
const res = "mobile/android/app/src/main/res";
const font = "https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@75..125,200..900&display=block";
const [first, second] = [brand.name[0], brand.name[1]];

/** The monogram from src/app/icon.svg: two letters, the second in gold, with a gold bar. */
function mark(size: number) {
  return `<div style="width:${size}px;height:${size}px;position:relative;font-family:'Mona Sans';font-weight:900;font-stretch:75%">
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-bottom:${size * 0.12}px;font-size:${size * 0.5}px;letter-spacing:${size * 0.02}px;color:${colors.fg};line-height:1">${first}<span style="color:${colors.accent}">${second}</span></div>
    <div style="position:absolute;left:${size * 0.1875}px;top:${size * 0.703}px;width:${size * 0.625}px;height:${size * 0.0195}px;background:${colors.accent}"></div>
  </div>`;
}

function page(w: number, h: number, body: string, background: string, round = false) {
  return `<!doctype html><html><head><link rel="stylesheet" href="${font}"></head>
  <body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent">
  <div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background:${background};${round ? "border-radius:50%;" : ""}">${body}</div>
  </body></html>`;
}

const browser = await chromium.launch();
const tab = await browser.newPage();
async function shot(path: string, w: number, h: number, html: string, transparent = false) {
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(html, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(path), { recursive: true });
  await tab.screenshot({ path, omitBackground: transparent });
}

// iPhone: one 1024px icon (no transparency allowed) and the launch screen.
await shot(`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, 1024, 1024, page(1024, 1024, mark(1024), colors.bg));
for (const n of ["", "-1", "-2"]) {
  await shot(`${ios}/Splash.imageset/splash-2732x2732${n}.png`, 2732, 2732, page(2732, 2732, mark(800), colors.bg));
}

// Android: launcher icons per screen density, plus the adaptive-icon foreground
// (the mark sits in the middle two thirds, which every launcher shape shows).
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const;
for (const [d, k] of Object.entries(densities)) {
  const icon = 48 * k;
  const fg = 108 * k;
  await shot(`${res}/mipmap-${d}/ic_launcher.png`, icon, icon, page(icon, icon, mark(icon), colors.bg));
  await shot(`${res}/mipmap-${d}/ic_launcher_round.png`, icon, icon, page(icon, icon, mark(icon), colors.bg, true), true);
  await shot(`${res}/mipmap-${d}/ic_launcher_foreground.png`, fg, fg, page(fg, fg, mark(fg * 0.66), "transparent"), true);
  const [short, long] = [320 * k, 480 * k];
  await shot(`${res}/drawable-port-${d}/splash.png`, short, long, page(short, long, mark(short * 0.5), colors.bg));
  await shot(`${res}/drawable-land-${d}/splash.png`, long, short, page(long, short, mark(short * 0.5), colors.bg));
}
await shot(`${res}/drawable/splash.png`, 480, 320, page(480, 320, mark(160), colors.bg));
writeFileSync(
  `${res}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${colors.bg}</color>\n</resources>\n`,
);
await browser.close();

// Offline page: shown by the app when the site can't be reached.
const site = "https://www." + brand.domain + "/browse";
writeFileSync(
  "mobile/www/offline.html",
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${brand.name}: no connection</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: ${colors.bg}; color: ${colors.fg}; font-family: -apple-system, system-ui, sans-serif; text-align: center; }
  main { padding: 24px; max-width: 320px; }
  h1 { font-size: 24px; margin: 0 0 8px; }
  p { color: ${colors.muted}; margin: 0 0 24px; line-height: 1.5; }
  a { display: inline-block; min-height: 44px; line-height: 44px; padding: 0 24px; border-radius: 999px;
    background: ${colors.accent}; color: ${colors["accent-ink"]}; font-weight: 700; text-decoration: none; }
</style>
</head>
<body>
<main>
  <h1>No connection</h1>
  <p>${brand.name} needs the internet to find partners and load your chats. Check your signal or Wi-Fi.</p>
  <a href="${site}">Try again</a>
</main>
</body>
</html>
`,
);
console.log("Phone app icons, splash screens and offline page written.");
