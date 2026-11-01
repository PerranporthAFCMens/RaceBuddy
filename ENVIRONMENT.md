# Environments

| | Dev site | Live site |
| --- | --- | --- |
| Git branch | `dev` | `main` |
| Vercel project | `race-buddy-dev` | `race-buddy` |
| Address | `race-buddy-dev` project's address | https://race-buddy-livid.vercel.app |
| Supabase | same project, `ypxwqtpdmjmvrdmsedpb` | same project |
| `NEXT_PUBLIC_SITE_ENV` | `dev` | `live` |
| Looks like | gold "Dev site" bar, hidden from search, `/styleguide` open | no bar, `/styleguide` hidden |
| Emails | `EMAIL_FROM` blank: only reach Adam's own inbox | real sender |

## One database, like HybridOS

Both sites use the same Supabase project (HybridOS does the same: one project behind its dev and live sites, with a test gym for experiments). So:

- Test accounts and test listings go on the test race (`test-race`, "Test Race (dev only)": shown on the dev site, never on live), never on a real KeltX race, and are deleted after use (`npm run test:live` cleans up after itself).
- A database change reaches live as soon as Adam runs it, while live still runs the older code. Every migration must work with the code on both `dev` and `main` (add things; remove or rename only in a later release, once live no longer uses them).

## How code moves

```
work branch --PR (checks must pass)--> dev --> dev site
dev --release PR (checks must pass, Adam merges)--> main --> live site
```

- Each Vercel project builds only its own branch (`scripts/vercel-ignore-build.sh`). Work branches and PRs are not deployed.
- Every Vercel build runs `npm run build:vercel`: lint (with the brand rule), typecheck, tokens check and unit/contrast tests, then the build. A failure stops the deploy.

## Required checks (GitHub rulesets)

On `dev` and `main`: `app`, `brand`, `database`. On `main` also `release-flow` (only `dev` may open a PR into `main`). No direct pushes; changes come in by PR.

## Environment variables (each Vercel project, Production)

`NEXT_PUBLIC_SITE_ENV`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `TICKET_TAILOR_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`. Both sites use the same Supabase values; only `NEXT_PUBLIC_SITE_ENV` and `NEXT_PUBLIC_SITE_URL` differ. Never put the values in the repo.
