// Checks database migrations against the rules in src/lib/migration-check.ts.
//
//   npm run migrations:check                         compare with origin/dev
//   MIGRATIONS_BASE=origin/main npm run migrations:check
//
// Runs in the `database` CI job against the PR's base branch.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { checkMigrations } from "../src/lib/migration-check.ts";

const MIG = "supabase/migrations";
const base = process.env.MIGRATIONS_BASE || "origin/dev";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const lines = (s: string) => (s ? s.split("\n") : []);

let mergeBase: string;
try {
  mergeBase = git("merge-base", base, "HEAD");
} catch {
  console.error(`Cannot find ${base}. Fetch it first (git fetch origin ${base.replace(/^origin\//, "")}).`);
  process.exit(2);
}

const migrations = readdirSync(MIG).filter((f) => f.endsWith(".sql"));
const rollbacks = readdirSync("supabase/rollback");
const baseMigrations = lines(git("ls-tree", "--name-only", `${mergeBase}:${MIG}`)).filter((f) => f.endsWith(".sql"));

const added: Record<string, string> = {};
const changedOnBase: string[] = [];
// Compare the working tree, so uncommitted edits count too.
for (const row of lines(git("diff", "--name-status", "--no-renames", mergeBase, "--", MIG))) {
  const [status, path] = row.split("\t");
  const name = path.slice(MIG.length + 1);
  if (status === "A") added[name] = readFileSync(path, "utf8");
  else changedOnBase.push(name);
}
for (const f of migrations) {
  if (!baseMigrations.includes(f) && !(f in added)) added[f] = readFileSync(`${MIG}/${f}`, "utf8");
}

const problems = checkMigrations({ migrations, rollbacks, added, baseMigrations, changedOnBase });
console.log(`Migrations: ${migrations.length} (${Object.keys(added).length} new since ${base}).`);
if (problems.length) {
  for (const p of problems) console.log(`  FAIL ${p}`);
  process.exit(1);
}
console.log("All migration rules pass.");
