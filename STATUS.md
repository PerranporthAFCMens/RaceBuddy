# Race Buddy status

Short current-state page. Per-change notes are in `docs/notes/`.

## Sites

- Live: https://race-buddy-livid.vercel.app (Vercel `race-buddy`, branch `main`, live Supabase).
- Dev: Vercel `race-buddy-dev`, branch `dev`, same Supabase. Being set up; see `ENVIRONMENT.md`.

## Database

Migrations applied (checked 2026-10-30): `20261029120000_core.sql`, `seed.sql`, `20261030120000_test_race.sql`. NOT yet applied: `20261029170000_looking_for.sql` (the live site's code already needs it). Adam runs SQL by hand in the Supabase SQL editor; merging does not apply it.

## Next work

- Stripe name-change payment and Ticket Tailor discount code.
- Organiser view (admin, owner, read-only staff).
- iOS app with Capacitor.
