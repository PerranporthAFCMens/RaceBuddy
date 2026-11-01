-- Undoes 20261101120000_lock_down_match_alerts.sql by restoring Supabase's
-- default grants. Row level security still limits rows to their owner.
grant all on public.match_alerts to anon, authenticated;
