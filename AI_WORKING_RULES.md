# AI working rules (Race Buddy)

Give this file to whichever AI is working on the repo. These rules apply to every task, every time. Adapted from the HybridOS rules.

## 1. How to work

1. **One task per branch.** Branch from `dev`, named `fix/...`, `feat/...` or the branch the session gives you. Never push directly to `dev` or `main`.
2. **Open a pull request onto `dev`** for every change. The description lists what changed and why, every file touched, and anything noticed but NOT changed.
3. **Small changes.** If a task needs more than roughly 5 files, stop and propose a plan first.
4. **Read before you edit.** Open the actual current file.
5. **Do not touch unrelated code**, including formatting, renaming and quick clean-ups. Log them as suggestions instead.
6. **You open PRs. Adam merges**, except the narrow case in rule 12.
7. **Nothing touches `main`, rulesets, Vercel settings or the live Supabase project without Adam's approval of the exact text** (the exact SQL, command or setting).
8. **Stop at the first problem and report.** Do not fix forward. If something breaks after a merge or a live change, roll back first and investigate second.
9. **`STATUS.md` stays short; one note per change.** At the start of a task read `STATUS.md`. Add one small note file in `docs/notes/` per PR; update `STATUS.md` only when the live state or next-work list changes.
10. **Plain English.** Adam is not a developer. Explain each step he must do, exactly, and what a pass or fail looks like. Never guess a screen or button name; check the docs first.
11. **The repository is public.** Never put secrets, keys, passwords, personal emails or user IDs in it.
12. **Claude may merge safe PRs into `dev`.** Only when ALL are true:
    - the PR's base is `dev` (never `main`);
    - every required check is green and there are no conflicts;
    - the PR does not touch `.github/**`, `supabase/**`, `vercel.json`, `scripts/vercel-ignore-build.sh`, `eslint-rules/**`, `src/design/tokens.ts`, `e2e/__screenshots__/**`, `playwright.config.ts`, or any rules file (`CLAUDE.md`, `AI_WORKING_RULES.md`, `ENVIRONMENT.md`, `BRAND.md`);
    - it does not change a test to make it pass.
    After merging, check the dev site deployed and tell Adam in one line. If anything fails, open a revert PR. Adam can end this rule at any time by saying so.
13. **Workflow files** (`.github/**`) may change on a PR branch when the task needs it; list each change in the PR. Never change who can deploy, secrets, or loosen a check.

## 2. Definition of done

Not done until you have shown:
- the commands run and their pass/fail counts (not "looks good");
- for any UI change, a phone-size screenshot or the brand test result;
- that the existing brand and database tests still pass.

"Fixed" without evidence means not fixed. If you cannot run something, say so and tell Adam exactly what to check by hand.

## 3. Brand rules (enforced by required checks)

- `BRAND.md` is the rulebook; the published brand guide is the picture of it.
- The `app` check runs the brand lint rule (no raw colours, default palette or arbitrary sizes), `tokens:check`, and the contrast/stylesheet tests. The `brand` check runs Playwright: on-screen colours, fonts and corners, accessibility, tap targets and screenshots.
- The same lint, token and unit checks also run inside every Vercel build (`npm run build:vercel`), so even a direct push cannot deploy off-brand code.
- Never relax a brand rule, contrast threshold or screenshot tolerance to get green. New screenshots only for a deliberate design change, named in the PR.

## 4. Database rules

- Every schema change (tables, columns, RLS, functions, grants) is a migration file with a rollback in `supabase/rollback/`. Never only through the dashboard.
- Never remove or loosen an RLS policy to make a feature work.
- No service-role key in browser code, chat or the repo.
- Order: Adam runs the exact SQL on the **dev** database, the PR merges to `dev`, the dev site is checked; at release Adam runs the same SQL on **live** before merging the release PR.
- Security-definer functions bypass RLS: each must check who is calling.
- `npm run test:live` creates throwaway users: run it against the dev database only.

## 5. Release rules (dev -> live)

- A release is a PR from `dev` into `main`, titled `Release YYYY-MM-DD`. CI refuses a PR into `main` from any other branch.
- All required checks must pass on the release PR. Adam merges it; Claude never does.
- Before merging: run any pending migrations on live (exact SQL in the PR), and check the dev site on a phone.
- After merging: check Vercel shows the release commit READY on the live site, open the live site on a phone, then say it is done.
- Rollback: in Vercel, promote the previous live deployment, then open a revert PR.
- No releases on a race day.

## 6. Honesty rules

- Say when you are unsure, when a test is missing, or when a request conflicts with these rules.
- If a tool blocks a write, report the exact message. Do not work around it.
- If you find a bug outside the task, report it. Do not silently fix it.

## 7. Working style with Adam

- Anything Adam must do goes FIRST, as numbered steps, one action each.
- When Adam says stop, or asks a question, stop and answer first.
- Keep replies short. Give the PR link, not a pasted report.
