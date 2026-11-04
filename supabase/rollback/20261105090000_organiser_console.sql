-- Undoes 20261105090000_organiser_console.sql. Deletes every organiser role,
-- Race Buddy admin and hidden member. Puts feed_entries, entry_fits and
-- send_partner_request back as they were (20261029170000 / core).
-- Organiser themes chosen in the console stay in organisers.theme.
-- migration-check: destructive ok (rollback)
begin;
create or replace view public.feed_entries as
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
left join public.categories c on c.id = e.category_id
;

create or replace function public.entry_fits(viewer uuid, other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      v.user_id <> o.user_id
      and v.event_id = o.event_id
      and (
        (v.situation = 'spare_spot' and o.situation in ('need_spot', 'single'))
        or (v.situation in ('need_spot', 'single') and o.situation = 'spare_spot')
        or (v.situation = 'single' and o.situation = 'single')
      )
      and (case when v.has_ticket then array[v.category_id] else v.wanted_category_ids end)
          && (case when o.has_ticket then array[o.category_id] else o.wanted_category_ids end)
      and (
        v.partner_five_k_range is null
        or vp.five_k_seconds is null
        or op.five_k_seconds is null
        or abs(vp.five_k_seconds - op.five_k_seconds) <= v.partner_five_k_range
      )
      and (
        cardinality(v.partner_regions) = 0
        or op.region is null
        or op.region = any (v.partner_regions)
      )
    from public.entries v
    join public.profiles vp on vp.id = v.user_id
    join public.entries o on o.id = other
    join public.profiles op on op.id = o.user_id
    where v.id = viewer
  ), false);
$$;

create or replace function public.send_partner_request(p_to_entry uuid, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target public.entries;
  mine public.entries;
  req_id uuid;
begin
  if me is null then raise exception 'Please sign in.'; end if;

  select * into target from public.entries where id = p_to_entry;
  if not found then raise exception 'That listing no longer exists.'; end if;
  if target.user_id = me then raise exception 'You cannot partner with yourself.'; end if;
  if target.status <> 'looking' then raise exception 'They are not looking for a partner right now.'; end if;
  if public.is_blocked_between(me, target.user_id) then raise exception 'You cannot contact this athlete.'; end if;

  select * into mine from public.entries where user_id = me and event_id = target.event_id;
  if not found then
    raise exception 'Add your own race listing for this event first.';
  end if;

  insert into public.partner_requests (event_id, from_user, to_user, from_entry_id, to_entry_id, note)
  values (target.event_id, me, target.user_id, mine.id, target.id, nullif(btrim(p_note), ''))
  returning id into req_id;
  return req_id;
exception
  when unique_violation then
    raise exception 'You have already sent them a request.';
end $$;

drop function public.organiser_update_event(uuid, text, date);
drop function public.organiser_set_theme(uuid, text);
drop function public.organiser_remove_member(uuid, uuid);
drop function public.organiser_add_member(uuid, text, text);
drop function public.organiser_set_report_status(uuid, uuid, text);
drop function public.organiser_unhide_member(uuid, uuid);
drop function public.organiser_hide_member(uuid, uuid, text);
drop function public.organiser_team(uuid);
drop function public.organiser_event_stats(uuid);
drop function public.organiser_reports(uuid);
drop function public.organiser_lockins(uuid);
drop function public.organiser_members_list(uuid);
drop function public.my_organisers();
drop function public.require_event_role(uuid, boolean);
drop function public.require_organiser_role(uuid, boolean);
drop function public.event_role(uuid);
drop function public.organiser_role(uuid);
drop function public.is_hidden_at(uuid, uuid);
drop table public.event_hidden_members;
drop table public.organiser_members;
drop table public.platform_admins;
commit;
