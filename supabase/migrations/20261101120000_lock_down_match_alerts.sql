-- Match alerts are written only by the database itself (a trigger), so
-- people get read access to their own alerts and nothing else.
--
-- Supabase grants every new table to anon and authenticated by default.
-- Row level security already blocked writes, but the grants should not be
-- there either: the core migration revoked them for its tables, and this
-- does the same for match_alerts (added later). Safe for the code on both
-- dev and main: neither writes to this table from the app.

revoke all on public.match_alerts from anon, authenticated;
grant select on public.match_alerts to authenticated;
