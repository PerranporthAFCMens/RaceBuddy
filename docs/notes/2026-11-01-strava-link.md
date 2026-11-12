# 2026-11-01: Strava link on profiles

- Migration `20261101230000_strava_link.sql` adds `profiles.strava_url` (only
  `https://www.strava.com/athletes/<number>` or `https://strava.app.link/<code>`
  are allowed) and adds it to the end of the `athlete_profiles` view. Rollback in
  `supabase/rollback/`. Only adds, so the code on main is unaffected.
- The profile form has an optional "Strava profile" box. The app tidies pasted
  links (`src/lib/strava.ts`). The athlete page shows "<name> on Strava".
- The migration must run before this code reaches the dev site: the profile
  form saves `strava_url`, which fails until the column exists.
