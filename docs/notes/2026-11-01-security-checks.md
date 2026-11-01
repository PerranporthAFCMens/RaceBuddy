# 2026-11-01: automated security checks

- New workflow `.github/workflows/security.yml` with two jobs, `security` and `codeql`, on every PR, on pushes to dev/main, and weekly.
- `security`: `npm audit` (shipped packages at moderate+, everything at high+), gitleaks over the whole history (pinned version, checksum checked), and `npm run security:check`.
- `scripts/security-check.mts` also runs inside `npm run verify`, so Vercel builds stop on it too.
- Dependabot PRs into dev weekly for npm and GitHub Actions.
- Not changed: today `npm audit` shows moderate `minimatch` advisories in eslint's tools only (not shipped). They pass the high+ gate; Dependabot will offer the update.
