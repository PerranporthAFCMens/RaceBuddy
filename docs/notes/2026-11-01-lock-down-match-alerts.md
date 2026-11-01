# 2026-11-01: match alerts grants

- `npm run test:live` against the real database showed `match_alerts` still had Supabase's default write grants (row level security blocked the writes, so nothing leaked).
- The local test database now copies Supabase's default grants, so `npm run test:db` catches this; it failed before the fix and passes after.
- Migration `20261101120000_lock_down_match_alerts.sql` leaves people with read access to their own alerts only. Rollback in `supabase/rollback/`.
