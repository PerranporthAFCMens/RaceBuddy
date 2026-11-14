-- Owner console: two levels.
--
--   * Site admin (public.admins, from 20261112120000_safety.sql) sees and
--     changes everything: organisers, their owners, events, categories,
--     people and reports.
--   * Event owner (public.organiser_owners, new) runs their own organiser's
--     events: numbers, members, swaps, event details and colour theme. They
--     can hide a member from one of their events.
--
-- Owners never see chats, reports, emails or dates of birth. They see what
-- any signed-in athlete sees when browsing, plus the full names athletes
-- agreed to share when they locked in a partner.
--
-- New tables have no direct access for anon or authenticated. Everything goes
-- through the functions below, which check the role first, and every change
-- is written to console_log.
--
-- Only adds things, and replaces one view and two functions keeping their
-- columns and arguments, so it works with the code on both dev and main.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table public.organiser_owners (
  organiser_id uuid not null references public.organisers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organiser_id, user_id)
);
create index organiser_owners_user_idx on public.organiser_owners (user_id);

-- Members hidden from one event: they drop out of browse, matches and alerts
-- there, and cannot send or get partner requests there.
create table public.event_hidden_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 280),
  hidden_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Who changed what in the console, for the site admin's oversight.
create table public.console_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  organiser_id uuid references public.organisers (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  action text not null check (char_length(action) <= 40),
  detail text check (char_length(detail) <= 500),
  created_at timestamptz not null default now()
);
create index console_log_created_idx on public.console_log (created_at desc);

alter table public.organiser_owners enable row level security;
alter table public.event_hidden_members enable row level security;
alter table public.console_log enable row level security;
revoke all on public.organiser_owners, public.event_hidden_members, public.console_log
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

create function public.is_hidden_at(p_event uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.event_hidden_members where event_id = p_event and user_id = p_user
  );
$$;

-- Site admin, or an owner of this organiser.
create function public.can_run_organiser(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (select 1 from public.organiser_owners where organiser_id = p_org and user_id = auth.uid())
  );
$$;

-- Raises unless the signed-in person can run this event; returns its organiser.
create function public.require_event_owner(p_event uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare org uuid;
begin
  select organiser_id into org from public.events where id = p_event;
  if org is null or not public.can_run_organiser(org) then
    raise exception 'You don''t run this event.' using errcode = 'P0403';
  end if;
  return org;
end $$;

create function public.require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = 'P0403'; end if;
end $$;

create function public.log_console(p_org uuid, p_event uuid, p_action text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into public.console_log (actor_id, organiser_id, event_id, action, detail)
  values (auth.uid(), p_org, p_event, p_action, left(p_detail, 500));
$$;

-- ---------------------------------------------------------------------------
-- 3. Hidden members drop out of the feed, matches, alerts and requests
-- ---------------------------------------------------------------------------

-- Same columns as 20261029170000_looking_for.sql; hidden members are left
-- out, except to themselves.
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

-- Same as 20261029170000_looking_for.sql, plus: neither person is hidden.
-- Used by my_matches and the match-alert trigger.
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

-- Same as 20261029120000_core.sql, plus the two hidden-member checks.
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
    raise exception 'The organiser has taken your listing off this event.';
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
-- 4. Event owner level (site admins can use these too)
-- ---------------------------------------------------------------------------

-- Organisers the signed-in person runs. Site admins get every organiser.
create function public.my_organisers()
returns table (id uuid, slug text, name text, theme jsonb)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.name, o.theme
  from public.organisers o
  where public.can_run_organiser(o.id)
  order by o.name;
$$;

-- An organiser's events with headline numbers.
create function public.owner_events(p_org uuid)
returns table (
  id uuid, slug text, name text, venue text, starts_on date, ends_on date,
  is_active boolean, is_test boolean, listings int, looking int, locked_in int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_run_organiser(p_org) then
    raise exception 'You don''t run this organiser.' using errcode = 'P0403';
  end if;
  return query
  select ev.id, ev.slug, ev.name, ev.venue, ev.starts_on, ev.ends_on, ev.is_active, ev.is_test,
    (select count(*)::int from public.entries e where e.event_id = ev.id),
    (select count(*)::int from public.entries e where e.event_id = ev.id and e.status = 'looking'),
    (select count(*)::int from public.lockins l where l.event_id = ev.id and l.status = 'confirmed')
  from public.events ev
  where ev.organiser_id = p_org
  order by ev.starts_on desc;
end $$;

create function public.owner_event_stats(p_event uuid)
returns table (
  listings int, looking int, matched int, paused int, with_ticket int,
  verified int, without_ticket int, hidden int, locked_in int
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_owner(p_event);
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
    (select count(*)::int from public.lockins l where l.event_id = p_event and l.status = 'confirmed')
  from public.entries e
  where e.event_id = p_event;
end $$;

-- Members listed at the event: the details athletes see in browse. No email,
-- date of birth, reports or chats.
create function public.owner_members(p_event uuid)
returns table (
  entry_id uuid, user_id uuid, first_name text, age int, photo_path text,
  category_name text, has_ticket boolean, ticket_verified boolean,
  situation text, status text, listed_at timestamptz,
  hidden boolean, hidden_reason text
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_owner(p_event);
  return query
  select
    e.id, e.user_id, p.first_name,
    date_part('year', age(current_date, p.date_of_birth))::int,
    p.photo_path, c.name, e.has_ticket, e.ticket_verified,
    e.situation, e.status, e.created_at,
    h.user_id is not null, h.reason
  from public.entries e
  join public.profiles p on p.id = e.user_id
  left join public.categories c on c.id = e.category_id
  left join public.event_hidden_members h on h.event_id = e.event_id and h.user_id = e.user_id
  where e.event_id = p_event
  order by e.created_at desc;
end $$;

-- Confirmed lock-ins with the full names both athletes agreed to share.
create function public.owner_lockins(p_event uuid)
returns table (
  lockin_id uuid, category_name text, team_name text,
  proposer_full_name text, partner_full_name text, confirmed_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_event_owner(p_event);
  return query
  select l.id, c.name, e.team_name, l.proposer_full_name, l.partner_full_name, l.confirmed_at
  from public.lockins l
  join public.entries e on e.id = l.anchor_entry_id
  left join public.categories c on c.id = e.category_id
  where l.event_id = p_event and l.status = 'confirmed'
  order by l.confirmed_at desc;
end $$;

create function public.owner_hide_member(p_event uuid, p_user uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare org uuid := public.require_event_owner(p_event);
begin
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
  perform public.log_console(org, p_event, 'hide member',
    (select first_name from public.profiles where id = p_user) || coalesce(': ' || nullif(btrim(p_reason), ''), ''));
end $$;

create function public.owner_unhide_member(p_event uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare org uuid := public.require_event_owner(p_event);
begin
  delete from public.event_hidden_members where event_id = p_event and user_id = p_user;
  if found then
    perform public.log_console(org, p_event, 'restore member',
      (select first_name from public.profiles where id = p_user));
  end if;
end $$;

-- Details an owner may change. Visibility, organiser and web address stay
-- with the site admin.
create function public.owner_update_event(
  p_event uuid, p_name text, p_venue text, p_starts date, p_ends date,
  p_ticket_url text, p_cutoff date
) returns void
language plpgsql security definer set search_path = public as $$
declare org uuid := public.require_event_owner(p_event);
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Give the event a name (2 to 80 characters).';
  end if;
  if char_length(p_venue) > 120 then raise exception 'The venue is too long.'; end if;
  if p_starts is null or p_ends is null or p_ends < p_starts then
    raise exception 'The end date must be on or after the start date.';
  end if;
  if nullif(btrim(p_ticket_url), '') is not null
     and (btrim(p_ticket_url) !~ '^https://[^[:space:]<>"]+$' or char_length(btrim(p_ticket_url)) > 300) then
    raise exception 'The ticket link must start with https://';
  end if;
  if p_cutoff is not null and p_cutoff > p_ends then
    raise exception 'The name-change cutoff must be on or before the race.';
  end if;
  update public.events set
    name = btrim(p_name),
    venue = nullif(btrim(p_venue), ''),
    starts_on = p_starts,
    ends_on = p_ends,
    ticket_url = nullif(btrim(p_ticket_url), ''),
    name_change_cutoff = p_cutoff
  where id = p_event;
  perform public.log_console(org, p_event, 'edit event', btrim(p_name));
end $$;

-- Colour theme for the organiser's athletes (themes in src/design/tokens.ts).
create function public.owner_set_theme(p_org uuid, p_preset text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_run_organiser(p_org) then
    raise exception 'You don''t run this organiser.' using errcode = 'P0403';
  end if;
  if p_preset not in ('race-night', 'monochrome', 'daylight') then raise exception 'Unknown theme.'; end if;
  update public.organisers set theme = theme || jsonb_build_object('preset', p_preset) where id = p_org;
  perform public.log_console(p_org, null, 'theme', p_preset);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Site admin level
-- ---------------------------------------------------------------------------

create function public.admin_overview()
returns table (
  organisers int, events int, people int, listings int, looking int, locked_in int,
  open_reports int, urgent_reports int, suspended int, banned int
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select
    (select count(*)::int from public.organisers),
    (select count(*)::int from public.events),
    (select count(*)::int from public.profiles),
    (select count(*)::int from public.entries),
    (select count(*)::int from public.entries where status = 'looking'),
    (select count(*)::int from public.lockins where status = 'confirmed'),
    (select count(*)::int from public.reports where status in ('open', 'reviewing')),
    (select count(*)::int from public.reports where status in ('open', 'reviewing') and priority = 'urgent'),
    (select count(*)::int from public.account_status where status = 'suspended'),
    (select count(*)::int from public.account_status where status = 'banned');
end $$;

-- Find people by first name or email, optionally by account status. Admins only.
create function public.admin_people(p_query text default '', p_status text default null)
returns table (
  id uuid, first_name text, email text, age int, joined timestamptz,
  status text, listings int, reports_against int
)
language plpgsql stable security definer set search_path = public, auth as $$
declare q text := btrim(coalesce(p_query, ''));
begin
  perform public.require_admin();
  return query
  select p.id, p.first_name, u.email::text,
    date_part('year', age(current_date, p.date_of_birth))::int, p.created_at,
    coalesce(s.status, 'active'),
    (select count(*)::int from public.entries e where e.user_id = p.id),
    (select count(*)::int from public.reports r where r.reported_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.account_status s on s.user_id = p.id
  where (q = '' or p.first_name ilike '%' || q || '%' or u.email ilike '%' || q || '%')
    and (p_status is null or coalesce(s.status, 'active') = p_status)
  order by p.created_at desc
  limit 100;
end $$;

-- A person's listings, for the admin person screen.
create function public.admin_person_listings(p_user uuid)
returns table (event_name text, category_name text, has_ticket boolean, status text, hidden boolean, listed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query
  select ev.name, c.name, e.has_ticket, e.status, public.is_hidden_at(e.event_id, e.user_id), e.created_at
  from public.entries e
  join public.events ev on ev.id = e.event_id
  left join public.categories c on c.id = e.category_id
  where e.user_id = p_user
  order by ev.starts_on desc;
end $$;

-- Every organiser, with its owners' emails and number of events.
create function public.admin_organisers()
returns table (id uuid, slug text, name text, website_url text, theme jsonb, events int, owners text[])
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_admin();
  return query
  select o.id, o.slug, o.name, o.website_url, o.theme,
    (select count(*)::int from public.events ev where ev.organiser_id = o.id),
    coalesce((select array_agg(u.email::text order by u.email)
              from public.organiser_owners w join auth.users u on u.id = w.user_id
              where w.organiser_id = o.id), '{}')
  from public.organisers o
  order by o.name;
end $$;

-- Add (p_id null) or change an organiser. Returns its id.
create function public.admin_save_organiser(p_id uuid, p_name text, p_slug text, p_website_url text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare org_id uuid := p_id;
begin
  perform public.require_admin();
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Give the organiser a name (2 to 80 characters).';
  end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 60 then
    raise exception 'The short name can only use lower-case letters, numbers and dashes.';
  end if;
  if nullif(btrim(p_website_url), '') is not null
     and (btrim(p_website_url) !~ '^https://[^[:space:]<>"]+$' or char_length(btrim(p_website_url)) > 300) then
    raise exception 'The website must start with https://';
  end if;
  if org_id is null then
    insert into public.organisers (name, slug, website_url)
    values (btrim(p_name), p_slug, nullif(btrim(p_website_url), '')) returning id into org_id;
  else
    update public.organisers set name = btrim(p_name), slug = p_slug, website_url = nullif(btrim(p_website_url), '')
    where id = org_id;
    if not found then raise exception 'Organiser not found.'; end if;
  end if;
  perform public.log_console(org_id, null, case when p_id is null then 'add organiser' else 'edit organiser' end, btrim(p_name));
  return org_id;
exception when unique_violation then
  raise exception 'That short name is already taken.';
end $$;

-- Owners are added by email and must already have an account.
create function public.admin_add_owner(p_org uuid, p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare who uuid;
begin
  perform public.require_admin();
  select id into who from auth.users where lower(email) = lower(btrim(p_email));
  if who is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  insert into public.organiser_owners (organiser_id, user_id, added_by)
  values (p_org, who, auth.uid()) on conflict do nothing;
  perform public.log_console(p_org, null, 'add owner', lower(btrim(p_email)));
end $$;

create function public.admin_remove_owner(p_org uuid, p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.require_admin();
  delete from public.organiser_owners
  where organiser_id = p_org
    and user_id = (select id from auth.users where lower(email) = lower(btrim(p_email)));
  if not found then raise exception 'They aren''t an owner of this organiser.'; end if;
  perform public.log_console(p_org, null, 'remove owner', lower(btrim(p_email)));
end $$;

-- Every event, newest first.
create function public.admin_events()
returns table (
  id uuid, organiser_id uuid, organiser_name text, slug text, name text, venue text,
  starts_on date, ends_on date, ticket_url text, name_change_cutoff date,
  is_active boolean, is_test boolean, categories int, listings int
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query
  select ev.id, ev.organiser_id, o.name, ev.slug, ev.name, ev.venue, ev.starts_on, ev.ends_on,
    ev.ticket_url, ev.name_change_cutoff, ev.is_active, ev.is_test,
    (select count(*)::int from public.categories c where c.event_id = ev.id),
    (select count(*)::int from public.entries e where e.event_id = ev.id)
  from public.events ev join public.organisers o on o.id = ev.organiser_id
  order by ev.starts_on desc;
end $$;

-- Add (p_id null) or change an event, including whether athletes can see it.
create function public.admin_save_event(
  p_id uuid, p_organiser uuid, p_slug text, p_name text, p_venue text,
  p_starts date, p_ends date, p_ticket_url text, p_cutoff date, p_active boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare eid uuid := p_id;
begin
  perform public.require_admin();
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 60 then
    raise exception 'The short name can only use lower-case letters, numbers and dashes.';
  end if;
  if not exists (select 1 from public.organisers where id = p_organiser) then
    raise exception 'Choose an organiser.';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Give the event a name (2 to 80 characters).';
  end if;
  if p_starts is null or p_ends is null or p_ends < p_starts then
    raise exception 'The end date must be on or after the start date.';
  end if;
  if eid is null then
    insert into public.events (organiser_id, slug, name, starts_on, ends_on, is_active)
    values (p_organiser, p_slug, btrim(p_name), p_starts, p_ends, coalesce(p_active, false))
    returning id into eid;
  else
    update public.events set organiser_id = p_organiser, slug = p_slug, is_active = coalesce(p_active, is_active)
    where id = eid;
    if not found then raise exception 'Event not found.'; end if;
  end if;
  -- The rest has the same rules as for owners.
  perform public.owner_update_event(eid, p_name, p_venue, p_starts, p_ends, p_ticket_url, p_cutoff);
  perform public.log_console(p_organiser, eid,
    case when p_id is null then 'add event' else 'event visibility' end,
    case when coalesce(p_active, false) then 'shown to athletes' else 'hidden from athletes' end);
  return eid;
exception when unique_violation then
  raise exception 'That short name is already taken.';
end $$;

-- Categories (ticket types). Removing one that athletes use is refused.
create function public.admin_add_category(
  p_event uuid, p_name text, p_division text, p_gender text, p_race_day text, p_team_size int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  perform public.require_admin();
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception 'Give the category a name.';
  end if;
  insert into public.categories (event_id, name, division, gender, race_day, team_size, sort_order)
  values (p_event, btrim(p_name), p_division, p_gender, nullif(btrim(p_race_day), ''), p_team_size,
          coalesce((select max(sort_order) + 1 from public.categories where event_id = p_event), 0))
  returning id into cid;
  perform public.log_console((select organiser_id from public.events where id = p_event), p_event, 'add category', btrim(p_name));
  return cid;
exception when check_violation then
  raise exception 'Check the division, gender and team size.';
end $$;

create function public.admin_remove_category(p_category uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cat public.categories;
begin
  perform public.require_admin();
  select * into cat from public.categories where id = p_category;
  if not found then raise exception 'Category not found.'; end if;
  if exists (select 1 from public.entries where category_id = p_category or p_category = any (wanted_category_ids)) then
    raise exception 'Athletes are using this category, so it can''t be removed.';
  end if;
  delete from public.categories where id = p_category;
  perform public.log_console((select organiser_id from public.events where id = cat.event_id), cat.event_id, 'remove category', cat.name);
end $$;

-- The last 200 console changes, with who made them.
create function public.admin_console_log()
returns table (created_at timestamptz, actor_email text, organiser_name text, event_name text, action text, detail text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.require_admin();
  return query
  select l.created_at, u.email::text, o.name, ev.name, l.action, l.detail
  from public.console_log l
  left join auth.users u on u.id = l.actor_id
  left join public.organisers o on o.id = l.organiser_id
  left join public.events ev on ev.id = l.event_id
  order by l.created_at desc
  limit 200;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Who can call what
-- ---------------------------------------------------------------------------

-- Used inside the feed_entries view, which calls it as the signed-in person.
revoke execute on function public.is_hidden_at(uuid, uuid) from public, anon;
grant execute on function public.is_hidden_at(uuid, uuid) to authenticated;

-- Internal only.
revoke execute on function public.can_run_organiser(uuid) from public, anon, authenticated;
revoke execute on function public.require_event_owner(uuid) from public, anon, authenticated;
revoke execute on function public.require_admin() from public, anon, authenticated;
revoke execute on function public.log_console(uuid, uuid, text, text) from public, anon, authenticated;

-- Called from the app; each checks the role first.
revoke execute on function public.my_organisers() from public, anon;
revoke execute on function public.owner_events(uuid) from public, anon;
revoke execute on function public.owner_event_stats(uuid) from public, anon;
revoke execute on function public.owner_members(uuid) from public, anon;
revoke execute on function public.owner_lockins(uuid) from public, anon;
revoke execute on function public.owner_hide_member(uuid, uuid, text) from public, anon;
revoke execute on function public.owner_unhide_member(uuid, uuid) from public, anon;
revoke execute on function public.owner_update_event(uuid, text, text, date, date, text, date) from public, anon;
revoke execute on function public.owner_set_theme(uuid, text) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_people(text, text) from public, anon;
revoke execute on function public.admin_person_listings(uuid) from public, anon;
revoke execute on function public.admin_organisers() from public, anon;
revoke execute on function public.admin_save_organiser(uuid, text, text, text) from public, anon;
revoke execute on function public.admin_add_owner(uuid, text) from public, anon;
revoke execute on function public.admin_remove_owner(uuid, text) from public, anon;
revoke execute on function public.admin_events() from public, anon;
revoke execute on function public.admin_save_event(uuid, uuid, text, text, text, date, date, text, date, boolean) from public, anon;
revoke execute on function public.admin_add_category(uuid, text, text, text, text, int) from public, anon;
revoke execute on function public.admin_remove_category(uuid) from public, anon;
revoke execute on function public.admin_console_log() from public, anon;

grant execute on function public.my_organisers() to authenticated;
grant execute on function public.owner_events(uuid) to authenticated;
grant execute on function public.owner_event_stats(uuid) to authenticated;
grant execute on function public.owner_members(uuid) to authenticated;
grant execute on function public.owner_lockins(uuid) to authenticated;
grant execute on function public.owner_hide_member(uuid, uuid, text) to authenticated;
grant execute on function public.owner_unhide_member(uuid, uuid) to authenticated;
grant execute on function public.owner_update_event(uuid, text, text, date, date, text, date) to authenticated;
grant execute on function public.owner_set_theme(uuid, text) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_people(text, text) to authenticated;
grant execute on function public.admin_person_listings(uuid) to authenticated;
grant execute on function public.admin_organisers() to authenticated;
grant execute on function public.admin_save_organiser(uuid, text, text, text) to authenticated;
grant execute on function public.admin_add_owner(uuid, text) to authenticated;
grant execute on function public.admin_remove_owner(uuid, text) to authenticated;
grant execute on function public.admin_events() to authenticated;
grant execute on function public.admin_save_event(uuid, uuid, text, text, text, date, date, text, date, boolean) to authenticated;
grant execute on function public.admin_add_category(uuid, text, text, text, text, int) to authenticated;
grant execute on function public.admin_remove_category(uuid) to authenticated;
grant execute on function public.admin_console_log() to authenticated;
