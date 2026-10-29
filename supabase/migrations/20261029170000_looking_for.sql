-- "What are you looking for?": situations, partner criteria, matching and
-- match alerts.
--
-- Situations
--   spare_spot  has a ticket; partner or teammate dropped out
--   need_spot   no ticket; wants a spot on someone's team
--   single      no ticket; wants to find another single and enter together
--
-- Who matches whom
--   spare_spot <-> need_spot, spare_spot <-> single, single <-> single,
--   in the same event with an overlapping category, then filtered by the
--   viewer's own criteria (partner 5km range and areas).

alter table public.entries
  add column situation text check (situation in ('spare_spot', 'need_spot', 'single')),
  -- Partner's 5km must be within this many seconds of mine. Null = any.
  add column partner_five_k_range int check (partner_five_k_range between 30 and 1800),
  -- Areas the partner should be in. Empty = anywhere.
  add column partner_regions text[] not null default '{}',
  add column alerts_email boolean not null default true,
  -- For later: push through the iOS app or web push.
  add column alerts_push boolean not null default false;

update public.entries
set situation = case when has_ticket then 'spare_spot' else 'need_spot' end;

-- Keep situation in step with the ticket: a ticket always means spare_spot,
-- and no ticket can never be spare_spot.
create function public.set_entry_situation() returns trigger
language plpgsql as $$
begin
  if new.has_ticket then
    new.situation := 'spare_spot';
  elsif new.situation is null or new.situation = 'spare_spot' then
    new.situation := 'need_spot';
  end if;
  return new;
end $$;

create trigger entries_situation before insert or update on public.entries
for each row execute function public.set_entry_situation();

alter table public.entries alter column situation set not null;

-- The feed view gains the situation. New columns go at the end so the view
-- can be replaced in place.
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
left join public.categories c on c.id = e.category_id;

-- ---------------------------------------------------------------------------
-- Matching
-- ---------------------------------------------------------------------------

-- True when `other` is someone `viewer` is looking for. One-directional: it
-- applies the viewer's criteria to the other person. Ignores status and
-- blocks; callers check those.
create function public.entry_fits(viewer uuid, other uuid) returns boolean
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

-- The signed-in person's matches for one event: listings that fit their own
-- listing's criteria, still looking, and not blocked either way.
create function public.my_matches(p_event uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select o.id
  from public.entries mine
  join public.entries o on o.event_id = mine.event_id and o.user_id <> mine.user_id
  where mine.user_id = auth.uid()
    and mine.event_id = p_event
    and o.status = 'looking'
    and not public.is_blocked_between(mine.user_id, o.user_id)
    and public.entry_fits(mine.id, o.id);
$$;

-- ---------------------------------------------------------------------------
-- Match alerts: one row per (person told, listing they were told about)
-- ---------------------------------------------------------------------------

create table public.match_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  for_entry_id uuid not null references public.entries (id) on delete cascade,
  match_entry_id uuid not null references public.entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  unique (for_entry_id, match_entry_id)
);
create index match_alerts_unsent_idx on public.match_alerts (user_id) where emailed_at is null;

alter table public.match_alerts enable row level security;
create policy "read own alerts" on public.match_alerts for select
  to authenticated using (user_id = auth.uid());
grant select on public.match_alerts to authenticated;

-- When a listing is saved as looking, queue an alert for everyone whose
-- criteria it fits and who has email alerts on. Sending happens in the app.
create function public.queue_match_alerts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'looking' then return null; end if;
  insert into public.match_alerts (user_id, for_entry_id, match_entry_id)
  select r.user_id, r.id, new.id
  from public.entries r
  where r.event_id = new.event_id
    and r.user_id <> new.user_id
    and r.status = 'looking'
    and r.alerts_email
    and not public.is_blocked_between(r.user_id, new.user_id)
    and public.entry_fits(r.id, new.id)
  on conflict (for_entry_id, match_entry_id) do nothing;
  return null;
end $$;

create trigger entries_queue_alerts
after insert or update of status, situation, has_ticket, category_id, wanted_category_ids
on public.entries
for each row execute function public.queue_match_alerts();

revoke execute on function public.entry_fits(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.queue_match_alerts() from public, anon, authenticated;
revoke execute on function public.my_matches(uuid) from public, anon;
grant execute on function public.my_matches(uuid) to authenticated;
