# YGIG status

Short current-state page. Per-change notes are in `docs/notes/`. The code
still uses the working name "Race Buddy" in places (repo, Vercel projects);
the product name comes only from `src/design/brand.ts`.

## Sites

- Live: https://www.ygig.co.uk (Vercel `race-buddy`, branch `main`). The old
  https://race-buddy-livid.vercel.app address still works.
- Dev: https://race-buddy-dev.vercel.app (Vercel `race-buddy-dev`, branch `dev`,
  gold "Dev site" bar).
- Both sites use the same Supabase project. See `ENVIRONMENT.md`.

## Database

Adam runs each migration by hand in the Supabase SQL editor; merging does not
apply it. Checked 2026-11-12: `npm run test:live` passes 67/67 against the
shared database, which covers every migration up to
`20261112160000_fix_chat_report_evidence.sql`. The live test does not cover
`20261112200000_word_filter.sql`, so confirm that one before relying on it.

## Next work

- Owner console: site admin (`/admin`) and event owners (`/organiser`), PRs for parts 1 to 3 (2026-11-14). Database `20261114120000_owner_console.sql` was run on 2026-11-14 (live check 72/72).
- Phone apps (iOS and Android) with Capacitor, then the App Store and Google Play.
- Email alerts: switch on once `RESEND_API_KEY` and `CRON_SECRET` are set in
  both Vercel projects.

YGIG only makes the introduction between athletes. Name changes and payments
are handled by the athletes and the organiser, not by YGIG.
