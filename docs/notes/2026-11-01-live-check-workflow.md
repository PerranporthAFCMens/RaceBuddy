# 2026-11-01: Live check runs automatically

- New `.github/workflows/live-check.yml`: `npm run test:live` after each push to `main`, daily at 06:00 UTC, and by hand. Opens/closes a `live-check-alert` issue.
- `scripts/live-check.mts`: when `CI` is set, FAIL lines show the check name only (Actions logs are public).
- Needs repository secrets `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; skips with a warning until they exist.
- Checked here: `CI=1 npm run test:live` 51 passed, 0 failed, 0 leftover profiles or chats.
