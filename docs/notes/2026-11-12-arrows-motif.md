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
