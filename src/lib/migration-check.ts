/**
 * Rules for database migrations, checked in CI (scripts/check-migrations.mts).
 *
 * One database serves both the dev and live sites, and Adam runs each
 * migration by hand. So a migration must:
 *   - be named <14-digit timestamp>_<name>.sql, newer than every migration
 *     already on the base branch (they run in name order);
 *   - have a rollback with the same name in supabase/rollback/;
 *   - never be edited, renamed or deleted once it is on the base branch
 *     (the database already ran it; write a new migration instead);
 *   - not drop, rename, change the type of or empty anything unless it says so
 *     on purpose with a line: -- migration-check: destructive ok (<why>)
 *     Live may still run code that uses the old thing (add first, remove later).
 */

/** Migrations from before the rollback rule (see supabase/rollback/README.md). */
export const NO_ROLLBACK_NEEDED = ["20261029120000_core.sql", "20261029170000_looking_for.sql"];

export const DESTRUCTIVE_OK = /--\s*migration-check:\s*destructive ok\s*\(\s*[^)\s]/i;

const DESTRUCTIVE: [RegExp, string][] = [
  [/\bdrop\s+(table|column|schema|type|view|materialized\s+view|function|trigger|index|sequence)\b/i, "drops something"],
  [/\brename\s+(column\s+)?\w+\s+to\b|\brename\s+to\b/i, "renames something"],
  [/\balter\s+column\s+\w+\s+(set\s+data\s+)?type\b/i, "changes a column type"],
  [/\btruncate\b/i, "empties a table"],
  [/\bdelete\s+from\b(?![^;]*\bwhere\b)/i, "deletes every row"],
];

/** SQL with comments and quoted strings blanked out, so only real statements are checked. */
function code(sql: string) {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:[^']|'')*'/g, "''");
}

export type MigrationInput = {
  /** File names in supabase/migrations/ on this branch. */
  migrations: string[];
  /** File names in supabase/rollback/ on this branch. */
  rollbacks: string[];
  /** Contents of migrations added on this branch, by file name. */
  added: Record<string, string>;
  /** Migration file names on the base branch (empty when there is no base). */
  baseMigrations: string[];
  /** Migrations on the base branch that this branch changed, renamed or deleted. */
  changedOnBase: string[];
};

export function checkMigrations(input: MigrationInput): string[] {
  const problems: string[] = [];
  const newestOnBase = [...input.baseMigrations].sort().at(-1);

  for (const f of input.migrations) {
    if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(f)) {
      problems.push(`${f}: name it <YYYYMMDDHHMMSS>_<lower_case_name>.sql`);
    }
    if (!NO_ROLLBACK_NEEDED.includes(f) && !input.rollbacks.includes(f)) {
      problems.push(`${f}: add its rollback as supabase/rollback/${f}`);
    }
  }
  for (const r of input.rollbacks) {
    if (r.endsWith(".sql") && !input.migrations.includes(r)) {
      problems.push(`rollback ${r}: no migration with that name`);
    }
  }
  for (const f of input.changedOnBase) {
    problems.push(`${f}: already on the base branch (the database has run it). Undo this edit and write a new migration`);
  }
  for (const [f, sql] of Object.entries(input.added)) {
    if (newestOnBase && f <= newestOnBase) {
      problems.push(`${f}: must sort after the newest migration on the base branch (${newestOnBase})`);
    }
    if (DESTRUCTIVE_OK.test(sql)) continue;
    const body = code(sql);
    for (const [pattern, what] of DESTRUCTIVE) {
      if (pattern.test(body)) {
        problems.push(
          `${f}: ${what}. Live may still use it. Remove it in a later release, or mark it: -- migration-check: destructive ok (<why>)`,
        );
      }
    }
  }
  return problems;
}
