# Release safety

What stops a release breaking Race Buddy or drifting from the brand, what is
still missing, and what to do when something goes wrong.

## Checklist (2026-11-01)

| # | Safety net | State |
| --- | --- | --- |
| 1 | Every PR into `dev` and `main` must pass `app`, `brand`, `database` (and `release-flow` on `main`) | Done (GitHub ruleset) |
| 2 | Only `dev` can be released to `main` | Done (`release-flow` check) |
| 3 | Brand lint, tokens and contrast tests run inside every Vercel build | Done (`npm run build:vercel`) |
| 4 | Screenshot, accessibility (axe) and tap-target tests | Done (`brand` check) |
| 5 | Database rule tests on every PR | Done (`database` check) |
| 6 | **Smoke test on the real site after every merge into `dev` and `main`** | Done (`Smoke` workflow) |
| 7 | **Uptime check every 30 minutes, with an alarm** | Done (`Smoke` workflow opens an issue, which emails Adam) |
| 8 | Written rollback steps | Done (below) |
| 9 | Migration safety check in CI: every migration has a rollback, is never edited once merged, runs in order, and dropping or renaming needs a deliberate marker | Done (`database` check, `npm run migrations:check`) |
| 10 | Full live flow test (`npm run test:live`, 51 checks) runs after every release and daily | Done (`Live check` workflow; needs the two GitHub secrets below) |
| 11 | Error monitoring: crashes on the dev and live sites reach Adam with details | Done (Sentry, EU region; `src/lib/monitoring.ts`) |
| 12 | Database backups | Done: Supabase daily backups (checked 2026-11-01). Point-in-time recovery is a paid add-on: turn on before payments go live. Profile photos are not in the backups. |
| 13 | Daily alerts job (`/api/cron/alerts`) watched for failures | Later |
| 14 | Real-browser smoke test (page errors on load, sign-in screen works) | Later |
| 15 | Each release tagged with notes | Later |
| 16 | Security: package scanning, secret scanning, CodeQL, database permission checks, security headers | Owned by the security work (`.github/workflows/security.yml`) |

## The smoke test

`scripts/smoke-check.mts` (run by `.github/workflows/smoke.yml`) checks a deployed site from the outside, read-only, 22 checks:

- `/api/health` answers, the database answers, it is the right site (dev or live), and after a merge it is running that exact commit (waits up to 15 minutes for Vercel).
- The test race is listed on dev and hidden on live.
- Home, login and privacy pages load in under 5 seconds, show the product name, and every style and script file they ask for exists.
- Dev has the gold bar and is hidden from search; live has neither.
- Signed-in pages send a signed-out visitor to login. `/styleguide` is open on dev and 404 on live.

Run it by hand: GitHub > Actions > Smoke > Run workflow. Or locally:

```
SMOKE_URL=https://race-buddy-livid.vercel.app SMOKE_SITE=live npm run test:smoke
```

Pass looks like `22 passed, 0 failed.` A fail prints `FAIL` lines and the issue "Smoke test failing: live site" (or dev) opens. It closes itself when the site passes again.

GitHub pauses scheduled runs if the repo has no activity for 60 days; any push turns them back on.

## When live breaks: rollback

1. Vercel > project `race-buddy` > Deployments.
2. Find the last deployment that worked (the one before the broken release), click the three dots, choose **Instant Rollback** (or **Promote**).
3. Run the smoke test (Actions > Smoke > Run workflow) and check the live site on a phone.
4. Fix on a branch into `dev`, or revert the release PR, and release again.

A rollback does not undo database changes. Migrations must work with both the old and new code (see `AI_WORKING_RULES.md`, section 4), so rolling back the code is safe; undo a migration only with its file in `supabase/rollback/`, and only if Adam decides to.

## Crash alerts (Sentry)

Crashes in the browser and on the server, on the dev and live sites only, go to Adam's Sentry project (EU data region), which emails him. Reports carry the error, where it happened, the site and the release; never cookies, IP addresses, request bodies, chat text, or the `?query` part of a web address (sign-in links carry one-time tokens there). See `src/lib/monitoring.ts`.

To test: open `https://race-buddy-dev.vercel.app/api/sentry-test` (dev only; 404 on live). It crashes on purpose and an issue "Sentry test crash from the dev site" appears in Sentry within a minute.

## Live check (real database)

`.github/workflows/live-check.yml` runs `npm run test:live` after every push to `main` and every day at 06:00 UTC. It signs up throwaway users on the test race, runs the whole flow, then deletes them. Failure opens the issue "Live check failing" (closes itself on the next pass). Logs are public, so in CI it prints check names only, never row data.

It needs two repository secrets (GitHub > repo > Settings > Secrets and variables > Actions): `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, the same values as in Vercel. Without them it skips with a warning.
