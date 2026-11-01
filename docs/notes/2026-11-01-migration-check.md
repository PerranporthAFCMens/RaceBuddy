# 2026-11-01: Migration safety check

`npm run migrations:check` (rules in `src/lib/migration-check.ts`, 10 unit tests) now runs first in the `database` CI job. It fails a PR when a migration:

- has no rollback in `supabase/rollback/` (the two oldest migrations are exempt; they predate the rule);
- was already on the base branch and has been edited, renamed or deleted (the database has run it: write a new one);
- is badly named, or does not sort after the newest migration on the base branch;
- drops, renames, changes the type of, truncates or deletes every row of something, unless it carries `-- migration-check: destructive ok (<why>)`. One database serves dev and live, so live may still use the old thing.
