# New Home Screen icon (2026-11-12)

**What:** the app icon is now the stacked "YG / IG" letters (white, last G gold, black outline where they overlap) on black, as PNG images.

**Why:** the old icon was a single SVG that used the Impact font. iPhones ignore SVG icons for the Home Screen (they need a PNG `apple-touch-icon`), and most phones don't have Impact, so the letters came out thin or not at all.

**Files**
- `src/app/icon.png` (64px): browser tab icon. Next.js adds the `<link rel="icon">` tag.
- `src/app/apple-icon.png` (180px): iPhone/iPad Home Screen. Next.js adds `<link rel="apple-touch-icon">`.
- `public/icons/icon-192.png`, `icon-512.png`: Android / installed web app (listed in `src/app/manifest.ts`).
- `public/icons/maskable-512.png`: Android adaptive icon; letters shrunk to 85% so a round mask doesn't cut them.
- `public/icons/icon-1024.png`: master copy, also the App Store size.
- Removed: `src/app/icon.svg`, `public/icon.svg`.

**How they were made:** drawn in HTML with Mona Sans (wdth 125, wght 900) and the brand tokens `bg` #000, `fg` #fff, `accent` #c09b2f, then screenshotted with Playwright at each size. The source page is kept outside the repo in the project files (`race-buddy/ygig-icon/ygig-icon-source.html`).

**Not changed:** the double-arrow graphic Adam liked is going on the website separately.
