# 2026-10-29: separate dev and live sites

- Added `dev` branch -> dev site and `main` -> live site, each its own Vercel project, sharing one Supabase project (as HybridOS does).
- Vercel builds only the matching branch, and every build runs the lint, brand, token and unit checks first.
- CI runs on pushes to `dev` and `main`, and a `release-flow` check allows only `dev` to open a PR into `main`.
- Gold "Dev site" bar and no search indexing on the dev site; `/styleguide` hidden on live.
- Adopted the HybridOS AI rules as `CLAUDE.md` and `AI_WORKING_RULES.md`.
