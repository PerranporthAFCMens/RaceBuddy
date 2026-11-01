# 2026-11-01: Smoke test after every release, plus uptime alarm

- New `/api/health` (public, read-only): site, commit, database ok, whether the test race is listed.
- New `scripts/smoke-check.mts` (`npm run test:smoke`): 22 read-only checks against a deployed site.
- New `.github/workflows/smoke.yml`: runs after each merge into `dev`/`main` (waits for the new commit to be live) and every 30 minutes on both sites. On failure it opens a `smoke-alert` issue; on pass it closes it.
- `/api/health` added to the public paths in `src/lib/supabase/proxy.ts`.
- `docs/release-safety.md`: checklist of release safety nets and the rollback steps.
