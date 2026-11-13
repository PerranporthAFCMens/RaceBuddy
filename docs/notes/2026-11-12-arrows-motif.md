# 2026-11-12: Two-arrow motif on the website

Adam liked the two forward arrows (white "You go", gold "I go") from the icon
work and wanted them on the site. He was shown two options (A Badge, B Motion
trail); A was built.

- `src/components/Arrows.tsx`: `<Arrows />` (the mark, colours from tokens:
  `fill-fg`, `fill-accent`, cut line `stroke-bg`) and `<ArrowDivider />`
  (white rule with the arrows in the middle).
- Home page: arrows above the big logo, in place of the small `→` on the three
  "What are you looking for?" buttons, and as the dividers between the big bands
  (replacing the plain white rules).
- `/styleguide`: new "Arrows" section.
- Approved screenshots for home and the three styleguide pages refreshed
  (deliberate design change).

## 2026-11-13: arrows next to the name everywhere

Adam asked for the arrows next to YGIG all over the site. `<Logo />` now puts
small arrows in front of the name by default (`arrows` prop), so every header
(app screens, sign-in/join, terms, privacy, safety, Oops, styleguide) shows
them. The home page passes `arrows={false}` because it already has big arrows
above the logo. Emails and the app icon are unchanged.
