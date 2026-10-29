#!/usr/bin/env bash
# Runs the migration, seed and rule tests on a throwaway local Postgres.
# Usage: supabase/tests/run-tests.sh   (needs initdb/pg_ctl/psql on PATH)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/.."
pgbin="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
export PATH="$pgbin:$PATH"
data="$(mktemp -d)"
port=55432
trap 'pg_ctl -D "$data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$data"' EXIT
if [ "$(id -u)" = "0" ]; then
  echo "Run as a non-root user (Postgres refuses root)." >&2
  exit 1
fi
initdb -D "$data" -U postgres -A trust >/dev/null
pg_ctl -D "$data" -o "-p $port -k $data -c wal_level=logical" -l "$data/log" start >/dev/null
psql_() { psql -h "$data" -p $port -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql_ -f "$here/supabase-stub.sql"
for f in "$root"/migrations/*.sql; do psql_ -f "$f"; done
psql_ -f "$root/seed.sql"
psql_ -o /dev/null -f "$here/rules.sql"
echo "All database tests passed."
