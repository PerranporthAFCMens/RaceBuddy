-- Organiser console: who runs which organiser, and what they can do.
--
-- Roles
--   * Race Buddy admin (platform_admins): every organiser and event.
--   * Organiser owner: their organiser's events. Can hide members, handle
--     reports, add and remove staff, and change settings.
--   * Organiser staff: read-only view of their organiser's events.
--
-- Organisers never see chats, emails or dates of birth of athletes. They see
-- the same details any signed-in athlete sees when browsing, plus the full
-- names athletes chose to share when they locked in a partner.
--
-- The new tables have no direct access for anon or authenticated; everything
-- goes through the functions below, which check the role first.
--
-- Only adds things and replaces functions and a view with the same columns,
-- so it works with the code on both dev and main.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organiser_members (
  organiser_id uuid not null references public.organisers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organiser_id, user_id)
);
create index organiser_members_user_idx on public.organiser_members (user_id);

-- Members an organiser has hidden from one event: they drop out of browse,
-- matches and alerts for that event, and cannot send or get requests there.
create table public.event_hidden_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 280),
  hidden_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.platform_admins enable row level security;
alter table public.organiser_members enable row level security;
alter table public.event_hidden_members enable row level security;
revoke all on public.platform_admins, public.organiser_members, public.event_hidden_members
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------

create function public.is_hidden_at(p_event uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.event_hidden_members where event_id = p_event and user_id = p_user
  );
$$;

-- 'admin', 'owner', 'staff' or null for the signed-in person.
create function public.organiser_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    when exists (select 1 from public.platform_admins where user_id = auth.uid()) then 'admin'
    else (select role from public.organiser_members where organiser_id = p_org and user_id = auth.uid())
  end;
$$;

create function public.event_role(p_event uuid) returns text
language sql stable security definer set search_path = public as $$
  select public.organiser_role(organiser_id) from public.events where id = p_event;
$$;

-- Raises unless the signed-in person may see (any role) or change (admin or
-- owner) this organiser's data.
create function public.require_organiser_role(p_org uuid, p_change boolean) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  r text := public.organiser_role(p_org);
begin
  if r is null then raise exception 'You do not have access to this organiser.'; end if;
  if p_change and r = 'staff' then raise exception 'Staff accounts are read-only.'; end if;
  return r;
end $$;

create function public.require_event_role(p_event uuid, p_change boolean) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  org uuid;
begin
  select organiser_id into org from public.events where id = p_event;
  if org is null then raise exception 'Event not found.'; end if;
  return public.require_organiser_role(org, p_change);
end $$;

-- ---------------------------------------------------------------------------
-- Hidden members drop out of the feed, matches, alerts and requests
-- ---------------------------------------------------------------------------

-- Same columns as before; hidden members are left out (except to themselves).
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
where e.user_id = auth.uid() or not public.is_hidden_at(e.event_id, e.user_id);

-- Same as before, plus: neither listing belongs to a hidden member.
create or replace function public.entry_fits(viewer uuid, other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      v.user_id <> o.user_id
      and v.event_id = o.event_id
      and not public.is_hidden_at(v.event_id, v.user_id)
      and not public.is_hidden_at(o.event_id, o.user_id)
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

-- Same as before, plus the hidden-member check.
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
  if public.is_hidden_at(target.event_id, target.user_id) then
    raise exception 'That listing no longer exists.';
  end if;
  if public.is_hidden_at(target.event_id, me) then
    raise exception 'The organiser has paused your listing for this event.';
  end if;

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

-- ---------------------------------------------------------------------------
-- Console reads
-- ---------------------------------------------------------------------------

-- Organisers the signed-in person can open, with their role.
create function public.my_organisers()
returns table (id uuid, slug text, name text, theme jsonb, role text)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.name, o.theme, public.organiser_role(o.id)
  from public.organisers o
  where public.organiser_role(o.id) is not null
  order by o.name;
$$;

create function public.organiser_event_stats(p_event uuid)
returns table (
  listings int, looking int, matched int, paused int, with_ticket int,
  verified int, without_ticket int, hidden int, locked_in int, open_reports int
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, false);
  return query
  select
    count(*)::int,
    count(*) filter (where e.status = 'looking')::int,
    count(*) filter (where e.status = 'matched')::int,
    count(*) filter (where e.status = 'paused')::int,
    count(*) filter (where e.has_ticket)::int,
    count(*) filter (where e.ticket_verified)::int,
    count(*) filter (where not e.has_ticket)::int,
    (select count(*)::int from public.event_hidden_members h where h.event_id = p_event),
    (select count(*)::int from public.lockins l where l.event_id = p_event and l.status = 'confirmed'),
    (select count(*)::int from public.organiser_reports(p_event) r where r.status = 'open')
  from public.entries e
  where e.event_id = p_event;
end $$;

-- Members with a listing at the event: the details athletes see in browse.
create function public.organiser_members_list(p_event uuid)
returns table (
  entry_id uuid, user_id uuid, first_name text, age int, photo_path text,
  category_name text, has_ticket boolean, ticket_verified boolean,
  situation text, status text, listed_at timestamptz,
  hidden boolean, hidden_reason text, open_reports int
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, false);
  return query
  select
    e.id, e.user_id, p.first_name,
    date_part('year', age(current_date, p.date_of_birth))::int,
    p.photo_path, c.name, e.has_ticket, e.ticket_verified,
    e.situation, e.status, e.created_at,
    h.user_id is not null, h.reason,
    (select count(*)::int from public.reports r
      left join public.conversations cv on cv.id = r.conversation_id
      where r.reported_id = e.user_id and r.status = 'open'
        and (cv.event_id = p_event or r.conversation_id is null))
  from public.entries e
  join public.profiles p on p.id = e.user_id
  left join public.categories c on c.id = e.category_id
  left join public.event_hidden_members h on h.event_id = e.event_id and h.user_id = e.user_id
  where e.event_id = p_event
  order by e.created_at desc;
end $$;

-- Confirmed lock-ins with the full names both athletes agreed to share.
create function public.organiser_lockins(p_event uuid)
returns table (
  lockin_id uuid, category_name text, team_name text,
  proposer_full_name text, partner_full_name text, confirmed_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, false);
  return query
  select l.id, c.name, e.team_name, l.proposer_full_name, l.partner_full_name, l.confirmed_at
  from public.lockins l
  join public.entries e on e.id = l.anchor_entry_id
  left join public.categories c on c.id = e.category_id
  where l.event_id = p_event and l.status = 'confirmed'
  order by l.confirmed_at desc;
end $$;

-- Reports about people at this event: made from one of its chats, or about
-- someone with a listing there. The reason text only, never the chat.
create function public.organiser_reports(p_event uuid)
returns table (
  report_id uuid, reported_id uuid, reported_name text, reporter_name text,
  reason text, status text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, false);
  return query
  select r.id, r.reported_id, rp.first_name, fp.first_name, r.reason, r.status, r.created_at
  from public.reports r
  join public.profiles rp on rp.id = r.reported_id
  join public.profiles fp on fp.id = r.reporter_id
  where exists (select 1 from public.conversations cv where cv.id = r.conversation_id and cv.event_id = p_event)
     or (r.conversation_id is null
         and exists (select 1 from public.entries e where e.event_id = p_event and e.user_id = r.reported_id))
  order by (r.status = 'open') desc, r.created_at desc;
end $$;

-- Owners and staff. Owners see staff emails because they added them by email.
create function public.organiser_team(p_org uuid)
returns table (user_id uuid, email text, role text, added_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_organiser_role(p_org, false);
  return query
  select m.user_id, u.email::text, m.role, m.created_at
  from public.organiser_members m
  join auth.users u on u.id = m.user_id
  where m.organiser_id = p_org
  order by (m.role = 'owner') desc, u.email;
end $$;

-- ---------------------------------------------------------------------------
-- Console changes (admin or owner only)
-- ---------------------------------------------------------------------------

create function public.organiser_hide_member(p_event uuid, p_user uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, true);
  if not exists (select 1 from public.entries where event_id = p_event and user_id = p_user) then
    raise exception 'That member has no listing at this event.';
  end if;
  insert into public.event_hidden_members (event_id, user_id, reason, hidden_by)
  values (p_event, p_user, nullif(btrim(p_reason), ''), auth.uid())
  on conflict (event_id, user_id) do update set reason = excluded.reason;
  -- Their open requests at this event close.
  update public.partner_requests
  set status = case when from_user = p_user then 'withdrawn' else 'declined' end,
      responded_at = now()
  where event_id = p_event and status = 'pending'
    and (from_user = p_user or to_user = p_user);
end $$;

create function public.organiser_unhide_member(p_event uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, true);
  delete from public.event_hidden_members where event_id = p_event and user_id = p_user;
end $$;

create function public.organiser_set_report_status(p_event uuid, p_report uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_event_role(p_event, true);
  if p_status not in ('open', 'actioned', 'dismissed') then raise exception 'Unknown status.'; end if;
  if not exists (select 1 from public.organiser_reports(p_event) r where r.report_id = p_report) then
    raise exception 'Report not found.';
  end if;
  update public.reports set status = p_status where id = p_report;
end $$;

-- Adds someone who already has an account. Only Race Buddy admins add owners.
create function public.organiser_add_member(p_org uuid, p_email text, p_role text default 'staff')
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  r text := public.require_organiser_role(p_org, true);
  who uuid;
begin
  if p_role not in ('owner', 'staff') then raise exception 'Unknown role.'; end if;
  if p_role = 'owner' and r <> 'admin' then raise exception 'Only Race Buddy can add owners.'; end if;
  select id into who from auth.users where lower(email) = lower(btrim(p_email));
  if who is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  insert into public.organiser_members (organiser_id, user_id, role, added_by)
  values (p_org, who, p_role, auth.uid())
  on conflict (organiser_id, user_id) do update set role = excluded.role
  where r = 'admin' or public.organiser_members.role = 'staff';
end $$;

-- Owners remove staff; admins remove anyone.
create function public.organiser_remove_member(p_org uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r text := public.require_organiser_role(p_org, true);
begin
  delete from public.organiser_members
  where organiser_id = p_org and user_id = p_user
    and (r = 'admin' or role = 'staff');
  if not found then raise exception 'Only Race Buddy can remove an owner.'; end if;
end $$;

-- Colour theme for the organiser's athletes (see themes in src/design/tokens.ts).
create function public.organiser_set_theme(p_org uuid, p_preset text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_organiser_role(p_org, true);
  if p_preset not in ('race-night', 'monochrome', 'daylight') then raise exception 'Unknown theme.'; end if;
  update public.organisers set theme = theme || jsonb_build_object('preset', p_preset) where id = p_org;
end $$;

create function public.organiser_update_event(p_event uuid, p_ticket_url text, p_cutoff date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
begin
  perform public.require_event_role(p_event, true);
  select * into ev from public.events where id = p_event;
  if p_ticket_url is not null and btrim(p_ticket_url) <> ''
     and btrim(p_ticket_url) !~ '^https://[^[:space:]<>"]{1,300}$' then
    raise exception 'The ticket link must start with https://';
  end if;
  if p_cutoff is not null and p_cutoff > ev.ends_on then
    raise exception 'The name-change cutoff must be on or before the race.';
  end if;
  update public.events
  set ticket_url = nullif(btrim(p_ticket_url), ''), name_change_cutoff = p_cutoff
  where id = p_event;
end $$;

-- ---------------------------------------------------------------------------
-- Who can call what
-- ---------------------------------------------------------------------------

revoke execute on function public.is_hidden_at(uuid, uuid) from public, anon;
grant execute on function public.is_hidden_at(uuid, uuid) to authenticated;

revoke execute on function public.organiser_role(uuid) from public, anon, authenticated;
revoke execute on function public.event_role(uuid) from public, anon, authenticated;
revoke execute on function public.require_organiser_role(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.require_event_role(uuid, boolean) from public, anon, authenticated;

revoke execute on function public.my_organisers() from public, anon;
revoke execute on function public.organiser_event_stats(uuid) from public, anon;
revoke execute on function public.organiser_members_list(uuid) from public, anon;
revoke execute on function public.organiser_lockins(uuid) from public, anon;
revoke execute on function public.organiser_reports(uuid) from public, anon;
revoke execute on function public.organiser_team(uuid) from public, anon;
revoke execute on function public.organiser_hide_member(uuid, uuid, text) from public, anon;
revoke execute on function public.organiser_unhide_member(uuid, uuid) from public, anon;
revoke execute on function public.organiser_set_report_status(uuid, uuid, text) from public, anon;
revoke execute on function public.organiser_add_member(uuid, text, text) from public, anon;
revoke execute on function public.organiser_remove_member(uuid, uuid) from public, anon;
revoke execute on function public.organiser_set_theme(uuid, text) from public, anon;
revoke execute on function public.organiser_update_event(uuid, text, date) from public, anon;

grant execute on function public.my_organisers() to authenticated;
grant execute on function public.organiser_event_stats(uuid) to authenticated;
grant execute on function public.organiser_members_list(uuid) to authenticated;
grant execute on function public.organiser_lockins(uuid) to authenticated;
grant execute on function public.organiser_reports(uuid) to authenticated;
grant execute on function public.organiser_team(uuid) to authenticated;
grant execute on function public.organiser_hide_member(uuid, uuid, text) to authenticated;
grant execute on function public.organiser_unhide_member(uuid, uuid) to authenticated;
grant execute on function public.organiser_set_report_status(uuid, uuid, text) to authenticated;
grant execute on function public.organiser_add_member(uuid, text, text) to authenticated;
grant execute on function public.organiser_remove_member(uuid, uuid) to authenticated;
grant execute on function public.organiser_set_theme(uuid, text) to authenticated;
grant execute on function public.organiser_update_event(uuid, text, date) to authenticated;
