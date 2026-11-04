# 2026-11-04: Organisers choose a colour theme

Adam wanted the three brand options (Race Night, Monochrome, Daylight) built
in, with each race organiser choosing one for their athletes.

- `src/design/tokens.ts`: `themes` lists the three. Each overrides only some
  colours; `npm run tokens` writes a `[data-theme="..."]` block per theme.
- Contrast tests now run for every theme. Daylight uses a deep gold
  (`#7a5d0f`) with white text, because bright gold on white is only 2.6:1.
- Signed-in screens read the theme from the organiser of the athlete's race
  (same race the Browse page picks). Public pages stay Race Night.
- No migration: `organisers.theme` (jsonb) already existed and is readable.
  To set one, Adam runs:
  `update public.organisers set theme = '{"preset": "daylight"}' where slug = '<organiser slug>';`
  Use `race-night`, `monochrome` or `daylight`. Anything else falls back to Race Night.
- `/styleguide?theme=monochrome` and `?theme=daylight` are in the brand tests
  (colours, contrast, tap size, screenshots).

Not done: a picker in the organiser view (that view does not exist yet). The
top bar stays the page colour in Daylight rather than the black bar in the
options document.
