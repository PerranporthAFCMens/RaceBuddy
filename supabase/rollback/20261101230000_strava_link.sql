-- Undoes 20261101230000_strava_link.sql. Deletes everyone's Strava links.
-- A view can't lose a column in place, so rebuild it as it was. feed_entries
-- depends on athlete_profiles, so it is rebuilt too (as in 20261029170000).
-- migration-check: destructive ok (rollback)
begin;
drop view public.feed_entries;
drop view public.athlete_profiles;
create view public.athlete_profiles as
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
  p.best_race_time
from public.profiles p
where auth.uid() is not null
  and not public.is_blocked_between(auth.uid(), p.id);
create view public.feed_entries as
select
  e.id,
  e.event_id,
  e.user_id,
  e.has_ticket,
  e.ticket_verified,
  e.category_id,
  c.name as category_name,
  c.division,
  c.gender,
  c.team_size,
  c.race_day,
  e.wanted_category_ids,
  e.team_name,
  e.spots_needed,
  e.stations,
  e.race_days,
  e.note,
  e.status,
  e.created_at,
  a.first_name,
  a.age,
  a.photo_path,
  a.gym,
  a.home_town,
  a.region,
  a.travel_miles,
  a.five_k_seconds,
  a.best_race_time,
  e.situation
from public.entries e
join public.athlete_profiles a on a.id = e.user_id
left join public.categories c on c.id = e.category_id;

-- New views get Supabase's default grants; put back exactly what they had.
revoke all on public.athlete_profiles, public.feed_entries from public, anon, authenticated;
grant select on public.athlete_profiles, public.feed_entries to authenticated;

alter table public.profiles drop column strava_url;
commit;
