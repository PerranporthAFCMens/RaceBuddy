-- Moderation screen: lists for admins, and the 12-month clean-up of closed
-- reports. Only adds functions, so it works with the code on dev and main.

-- Reports with names, most urgent first. p_filter: 'open' (open + reviewing),
-- 'underage', 'closed' or 'all'.
create function public.admin_reports(p_filter text default 'open')
returns table (
  id uuid, created_at timestamptz, category text, priority text, status text, reason text,
  reporter_id uuid, reporter_name text, reported_id uuid, reported_name text, reported_status text,
  message_id uuid, conversation_id uuid, evidence_count int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = 'P0403'; end if;
  return query
    select r.id, r.created_at, r.category, r.priority, r.status, r.reason,
           r.reporter_id, rp.first_name, r.reported_id, dp.first_name, coalesce(s.status, 'active'),
           r.message_id, r.conversation_id,
           (select count(*)::int from public.report_evidence e where e.report_id = r.id)
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles dp on dp.id = r.reported_id
    left join public.account_status s on s.user_id = r.reported_id
    where case p_filter
      when 'open' then r.status in ('open', 'reviewing')
      when 'underage' then r.category = 'underage' and r.status in ('open', 'reviewing')
      when 'closed' then r.status in ('actioned', 'dismissed')
      else true end
    order by case r.priority when 'urgent' then 0 when 'high' then 1 else 2 end, r.created_at
    limit 200;
end $$;
revoke execute on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;

-- One person, for reviewing a report or a suspected under-18 account.
-- Includes date of birth, which only admins ever see.
create function public.admin_person(p_user uuid)
returns table (
  first_name text, date_of_birth date, age int, joined timestamptz, status text, status_message text,
  reports_against int, reports_made int, blocked_by int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = 'P0403'; end if;
  return query
    select p.first_name, p.date_of_birth, date_part('year', age(current_date, p.date_of_birth))::int, p.created_at,
           coalesce(s.status, 'active'), s.message,
           (select count(*)::int from public.reports where reported_id = p.id),
           (select count(*)::int from public.reports where reporter_id = p.id),
           (select count(*)::int from public.blocks where blocked_id = p.id)
    from public.profiles p left join public.account_status s on s.user_id = p.id
    where p.id = p_user;
end $$;
revoke execute on function public.admin_person(uuid) from public, anon;
grant execute on function public.admin_person(uuid) to authenticated;

-- Closed reports (and their evidence) go 12 months after closing, and so do
-- old log rows. Run daily by the server's scheduled job, never by people.
create function public.purge_closed_reports() returns int
language plpgsql security definer set search_path = public as $$
declare gone int;
begin
  delete from public.reports
  where status in ('actioned', 'dismissed') and closed_at < now() - interval '12 months';
  get diagnostics gone = row_count;
  delete from public.evidence_access_log where created_at < now() - interval '12 months' and report_id is null;
  delete from public.moderation_actions where created_at < now() - interval '12 months' and report_id is null;
  return gone;
end $$;
revoke execute on function public.purge_closed_reports() from public, anon, authenticated;
grant execute on function public.purge_closed_reports() to service_role;
