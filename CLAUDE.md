# Race Buddy: working rules for Claude

@AGENTS.md

Owner (Adam) is not a developer: plain English, short exact steps, and say what a pass or fail looks like. Full rules are in `AI_WORKING_RULES.md`; read the section you need, not the whole file.

## Start of a task (keep it cheap)
- Read `STATUS.md` (short) only. Environment, deploy or database work: also `ENVIRONMENT.md`. Any screen or style work: `BRAND.md`.
- Read the actual current file before editing. Do not work from memory.

## Two sites
- `dev` branch -> **dev site** (Vercel project `race-buddy-dev`, dev Supabase, gold "Dev site" bar). `main` -> **live site** (Vercel project `race-buddy`, live Supabase).
- Work branches are never deployed. Code reaches dev only through a PR whose checks pass, and live only through a release PR from `dev` to `main`.

## Workflow
- One change per branch off `dev`, one PR onto `dev`. Never push to `dev` or `main`. Ask before anything touching `main`, releases, rulesets, Vercel settings or live Supabase.
- PR description: what and why, every file touched, anything noticed but not changed. Add a short note in `docs/notes/`; edit `STATUS.md` only when live state or the next-work list changes.
- Keep changes small (about 5 files); propose a plan first if bigger. No unrelated clean-ups. Never weaken a test to pass it.
- Evidence before "fixed": command run plus pass/fail counts (summarise, do not paste long logs).
- The repo is public: no secrets, tokens, personal emails or user IDs.

## Brand (required checks; nothing merges or deploys without them)
- Colours, fonts, sizes and corners only from tokens (`src/design/tokens.ts` -> `npm run tokens`). Product name only from `src/design/brand.ts`.
- New screen or component: add it to `/styleguide` or `e2e/brand.spec.ts`. Never relax the brand lint rule, contrast tests or screenshot tolerance. New screenshots (`npm run test:brand:update`) only for a deliberate design change, named in the PR.

## Database and access
- Every schema change is a migration in `supabase/migrations/` with a rollback in `supabase/rollback/` and a test in `supabase/tests/rules.sql`. Never loosen RLS to make a feature work. No service-role key in browser code.
- Hand Adam the exact SQL. It runs on the dev database first, then on live as part of a release. Never run SQL against live yourself.
- Organisers never see chats. Users are 18+.

## Checks
`npm run verify` (lint incl. brand rule, typecheck, tokens, unit + contrast tests), `npm run test:brand` (after `npm run build`), `npm run test:db` (as a non-root user). `npm run test:live` only against the dev database.
