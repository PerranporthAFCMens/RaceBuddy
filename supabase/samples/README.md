# Sample data

`athletes.json`: 30 made-up athletes for trying the app on the dev site. They
get listings on the Test Race only, which the live site never shows.

- `npm run samples:add` adds them (and removes any old samples first).
- `npm run samples:remove` removes them all.

Both need `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. This is a
script, not SQL, because Supabase doesn't let the SQL editor create accounts
(`must be owner of table users`).
