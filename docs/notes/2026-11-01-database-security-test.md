# 2026-11-01: database security test

- New `supabase/tests/security.sql`, run by `npm run test:db` (the `database` CI job) after every migration. It fails if: a public table has row level security off; signed-out visitors can do more than read organisers/events/categories; signed-in table access or callable functions differ from the lists in the file; an owner-rights function has no fixed search_path; the avatars bucket has no size or file-type limit.
- Checked that it catches each case: a new table without RLS, a new table left with Supabase's default grants, a function without search_path, and the database before this fix.
- Migration `20261101150000_security_hardening.sql`: `is_blocked_between`, `is_member` and `chat_has_block` were still callable by signed-out visitors through Postgres's PUBLIC grant (low risk: they only answer yes/no about ids). Now signed-in only. Avatars bucket limited to 2 MB and JPEG/PNG/WebP. Only removes access, so safe with dev and main code. Rollback in `supabase/rollback/`.
- The test stub's `storage.buckets` gained Supabase's `file_size_limit` and `allowed_mime_types` columns.
