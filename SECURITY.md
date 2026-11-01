# Security

## Reporting a problem

Please do not open a public issue. Use **Report a vulnerability** on the repository's Security tab, which reaches the owner privately. We aim to reply within 5 working days.

## What the checks cover

Every pull request runs the `security` and `codeql` jobs (`.github/workflows/security.yml`) as well as the app, brand and database checks:

- `npm audit`: no known problems in the packages the app ships (moderate or worse), or high/critical ones in build tools.
- gitleaks: no keys, tokens or passwords anywhere in the git history.
- `npm run security:check` (`scripts/security-check.mts`): secrets only in server code, no secret-looking `NEXT_PUBLIC_` settings, no raw HTML or `eval`, every server action checks who is signed in, every API route checks access, no `.env` or key files committed.
- CodeQL: GitHub's code scanner for the app and the workflows. Findings appear under Security > Code scanning.
- Dependabot (`.github/dependabot.yml`) opens update PRs into `dev` each week.

Never loosen a rule to get a pass; fix the code.
