# 2026-11-01: rate limits

- Migration `20261101160000_rate_limits.sql` adds a database rule (trigger) that refuses more than: 20 chat messages a minute or 300 an hour per person; 20 partner requests an hour or 50 a day; 10 reports a day. The refusal starts "Slow down", and the chat and report forms show it. Real people never get near these.
- Ticket Tailor order checks: at most 10 per person per hour, counted in the new `ticket_checks` table (server only: row level security on, no access for people). Stops guessing order numbers to get a verified badge. Until the migration runs, checks carry on as before.
- Only adds rules, so it works with dev and main code. Rollback in `supabase/rollback/`. Tests in `supabase/tests/rules.sql`.
- Sign-in and sign-up are rate limited by Supabase Auth itself (Authentication > Rate Limits in Supabase).
