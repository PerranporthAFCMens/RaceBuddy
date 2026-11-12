-- Undoes 20261112120000_safety.sql. Deletes admins, account statuses, bans,
-- report evidence, the evidence log and the moderation log, and the new
-- report columns. Reports whose people have since deleted their accounts are
-- deleted too, because the old rules need both people.
-- migration-check: destructive ok (rollback)
begin;
drop function public.moderate(text, uuid, uuid, text, text);
drop table public.moderation_actions;
drop function public.admin_report_evidence(uuid, text);
drop table public.evidence_access_log;
drop trigger reports_copy_evidence on public.reports;
drop function public.copy_report_evidence();
drop table public.report_evidence;
drop trigger reports_prepare on public.reports;
drop function public.prepare_report();
drop policy "admins read reports" on public.reports;
drop index public.reports_open_idx;
delete from public.reports where reporter_id is null or reported_id is null;
update public.reports set status = 'open' where status = 'reviewing';
alter table public.reports
  drop column closed_at,
  drop column reported_email_hash,
  drop column priority,
  drop column message_id,
  drop column category,
  drop constraint reports_status_check,
  drop constraint reports_reporter_id_fkey,
  drop constraint reports_reported_id_fkey;
alter table public.reports
  add constraint reports_status_check check (status in ('open', 'actioned', 'dismissed')),
  add constraint reports_reporter_id_fkey foreign key (reporter_id) references public.profiles (id) on delete cascade,
  add constraint reports_reported_id_fkey foreign key (reported_id) references public.profiles (id) on delete cascade,
  alter column reporter_id set not null,
  alter column reported_id set not null;
drop trigger profiles_protect on public.profiles;
drop function public.protect_profile();
alter table public.profiles drop column terms_accepted_at, drop column terms_version;
create or replace view public.athlete_profiles as
select
  p.id,
  p.first_name,
  date_part('year', age(current_date, p.date_of_birth))::int as age,
  p.photo_path,
  p.bio,
  p.gym,
  p.home_town,
  p.region,
  p.travel_miles,
  p.five_k_seconds,
  p.best_race_time,
  p.strava_url,
  p.results_url
from public.profiles p
where auth.uid() is not null
  and not public.is_blocked_between(auth.uid(), p.id);
drop trigger profiles_stop_restricted on public.profiles;
drop trigger entries_stop_restricted on public.entries;
drop trigger partner_requests_stop_restricted on public.partner_requests;
drop trigger lockins_stop_restricted on public.lockins;
drop trigger messages_stop_restricted on public.messages;
drop trigger message_reactions_stop_restricted on public.message_reactions;
drop function public.stop_restricted();
drop function public.email_hash(uuid);
drop table public.banned_emails;
drop table public.account_status;
drop function public.is_admin();
drop table public.admins;
commit;
