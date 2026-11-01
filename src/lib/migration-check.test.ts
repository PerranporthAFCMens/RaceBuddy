import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMigrations, type MigrationInput } from "./migration-check.ts";

const base: MigrationInput = {
  migrations: ["20261029120000_core.sql", "20261030120000_test_race.sql"],
  rollbacks: ["20261030120000_test_race.sql", "README.md"],
  added: {},
  baseMigrations: ["20261029120000_core.sql", "20261030120000_test_race.sql"],
  changedOnBase: [],
};

function withNew(name: string, sql: string, rollback = true): MigrationInput {
  return {
    ...base,
    migrations: [...base.migrations, name],
    rollbacks: rollback ? [...base.rollbacks, name] : base.rollbacks,
    added: { [name]: sql },
  };
}

test("the current shape passes", () => {
  assert.deepEqual(checkMigrations(base), []);
});

test("a safe additive migration passes", () => {
  const sql = "alter table public.events add column note text;\ncreate index on public.events (note);";
  assert.deepEqual(checkMigrations(withNew("20261102120000_add_note.sql", sql)), []);
});

test("a migration without a rollback fails", () => {
  const problems = checkMigrations(withNew("20261102120000_add_note.sql", "select 1;", false));
  assert.match(problems.join("\n"), /add its rollback/);
});

test("a badly named migration fails", () => {
  assert.match(checkMigrations(withNew("add-note.sql", "select 1;")).join("\n"), /name it/);
});

test("a migration older than the base's newest fails", () => {
  assert.match(checkMigrations(withNew("20261030000000_late.sql", "select 1;")).join("\n"), /must sort after/);
});

test("editing a migration already on the base fails", () => {
  const problems = checkMigrations({ ...base, changedOnBase: ["20261030120000_test_race.sql"] });
  assert.match(problems.join("\n"), /already on the base branch/);
});

test("drop, rename, type change, truncate and unfiltered delete are flagged", () => {
  for (const sql of [
    "alter table public.events drop column venue;",
    "drop table public.reports;",
    "alter table public.events rename column venue to place;",
    "alter table public.events rename to races;",
    "alter table public.events alter column venue type varchar(10);",
    "truncate public.reports;",
    "delete from public.reports;",
    "drop function public.my_matches();",
  ]) {
    const problems = checkMigrations(withNew("20261102120000_x.sql", sql));
    assert.equal(problems.length, 1, sql);
  }
});

test("a delete with a where clause, and words in comments or strings, pass", () => {
  const sql = "-- we will drop table later\ndelete from public.reports where id = 1;\nselect 'drop table x';";
  assert.deepEqual(checkMigrations(withNew("20261102120000_x.sql", sql)), []);
});

test("a destructive migration marked on purpose passes", () => {
  const sql = "-- migration-check: destructive ok (live stopped using venue in release 2026-12-01)\nalter table public.events drop column venue;";
  assert.deepEqual(checkMigrations(withNew("20261102120000_x.sql", sql)), []);
});

test("the marker needs a reason", () => {
  const sql = "-- migration-check: destructive ok ()\nalter table public.events drop column venue;";
  assert.equal(checkMigrations(withNew("20261102120000_x.sql", sql)).length, 1);
});
