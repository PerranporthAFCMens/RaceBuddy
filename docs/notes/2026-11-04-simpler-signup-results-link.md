# 2026-11-04: Simpler sign-up and a past results link

Adam asked for a simpler sign-up and less busy pages, and a way for athletes to
link their previous race results (example: a DB Max results page).

- Profile form (step 1 of sign-up and the My profile page): only photo, first
  name, date of birth, area and 5km time show up front. "Past races" and
  "About you" are folded away (optional) and open by themselves when they
  already have something in them.
- Join tab: no "forgot password" link (it was only for signing in); a short
  "At least 8 characters" hint under the password.
- Home page: shorter intro line, "How it works" cut from 5 steps to 3.
- New optional "Results link" box under Past races. Migration
  `20261104180000_results_link.sql` adds `profiles.results_url` (only
  `https://dbmaxresults.co.uk/...` or `https://results.hyrox.com/...`, max 300
  characters) and adds it to the end of the `athlete_profiles` view. Rollback
  in `supabase/rollback/`. Only adds, so the code on main is unaffected.
  The app tidies pasted links (`src/lib/results-link.ts`). The athlete page
  shows "<name>'s race results".
- To allow another results site: add the host in `src/lib/results-link.ts` and
  in a new migration that changes the check.
- The migration must run before this code reaches the dev site: the profile
  form saves `results_url`, which fails until the column exists.
