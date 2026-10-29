-- Race Buddy core schema: organisers, events, categories, profiles, race
-- listings (entries), partner requests, chat, lock-ins, blocks and reports.
--
-- Security model
--   * Every table has row level security on.
--   * People read each other only through the athlete_profiles and
--     feed_entries views, which hide date of birth and anyone blocked.
--   * Requests, chats and lock-ins change only through the functions at the
--     bottom of this file, so the rules live in one place.

-- ---------------------------------------------------------------------------
-- Organisers, events and categories (filled from Ticket Tailor)
-- ---------------------------------------------------------------------------

create table public.organisers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website_url text,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references public.organisers (id) on delete cascade,
  slug text not null unique,
  name text not null,
  venue text,
  starts_on date not null,
  ends_on date not null,
  tt_event_id text unique,
  ticket_url text,
  name_change_cutoff date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  division text not null check (division in ('doubles', 'pro', 'adaptive', 'relay')),
  gender text not null check (gender in ('male', 'female', 'mixed')),
  race_day text,
  team_size int not null check (team_size in (2, 4)),
  tt_ticket_type_id text,
  sort_order int not null default 0,
  unique (event_id, tt_ticket_type_id)
);
create index categories_event_idx on public.categories (event_id);

-- ---------------------------------------------------------------------------
-- Profiles (one per account, adults only)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  date_of_birth date not null,
  photo_path text,
  bio text check (char_length(bio) <= 500),
  gym text check (char_length(gym) <= 80),
  home_town text check (char_length(home_town) <= 80),
  region text check (char_length(region) <= 40),
  travel_miles int check (travel_miles between 0 and 1000),
  five_k_seconds int check (five_k_seconds between 600 and 3600),
  best_race_time text check (char_length(best_race_time) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.enforce_adult() returns trigger
language plpgsql as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Race Buddy is for adults only (18+).' using errcode = 'check_violation';
  end if;
  if new.date_of_birth < date '1920-01-01' then
    raise exception 'Please check your date of birth.' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_adult before insert or update on public.profiles
for each row execute function public.enforce_adult();

-- ---------------------------------------------------------------------------
-- Entries: a person's race listing for one event
-- ---------------------------------------------------------------------------

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  has_ticket boolean not null,
  category_id uuid references public.categories (id) on delete set null,
  wanted_category_ids uuid[] not null default '{}',
  team_name text check (char_length(team_name) <= 60),
  spots_needed int not null default 1 check (spots_needed between 1 and 3),
  stations text check (char_length(stations) <= 120),
  race_days text[] not null default '{}',
  note text check (char_length(note) <= 280),
  order_reference text check (char_length(order_reference) <= 40),
  ticket_verified boolean not null default false,
  verified_at timestamptz,
  status text not null default 'looking' check (status in ('looking', 'matched', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id),
  check (not has_ticket or category_id is not null)
);
create index entries_event_status_idx on public.entries (event_id, status);

-- One order can only verify one listing per event.
create unique index entries_verified_order_idx
  on public.entries (event_id, lower(order_reference))
  where ticket_verified;

-- People cannot mark their own ticket as verified. Only the server (service
-- role, after checking Ticket Tailor) can. Changing the ticket details clears
-- the badge.
create function public.protect_entry() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.ticket_verified := false;
    new.verified_at := null;
    if new.status = 'matched' then new.status := 'looking'; end if;
    return new;
  end if;
  new.ticket_verified := old.ticket_verified;
  new.verified_at := old.verified_at;
  if new.has_ticket is distinct from old.has_ticket
     or new.category_id is distinct from old.category_id
     or new.order_reference is distinct from old.order_reference
     or new.event_id is distinct from old.event_id then
    new.ticket_verified := false;
    new.verified_at := null;
  end if;
  -- "matched" is set by confirming a lock-in, never by hand.
  if new.status = 'matched' and old.status <> 'matched'
     and coalesce(current_setting('race_buddy.allow_match', true), 'off') <> 'on' then
    new.status := old.status;
  end if;
  return new;
end $$;

create trigger entries_protect before insert or update on public.entries
for each row execute function public.protect_entry();

-- ---------------------------------------------------------------------------
-- Blocks and reports
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ---------------------------------------------------------------------------
-- Conversations and messages
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in ('pair', 'team')),
  -- For a relay team listing, its single group chat.
  team_entry_id uuid unique references public.entries (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create function public.is_member(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

-- True when anyone else in the chat has blocked the sender, or the other way.
create function public.chat_has_block(conv uuid, who uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id <> who
      and public.is_blocked_between(m.user_id, who)
  );
$$;

create function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at
  where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;

create trigger messages_touch after insert on public.messages
for each row execute function public.touch_conversation();

-- ---------------------------------------------------------------------------
-- Partner requests
-- ---------------------------------------------------------------------------

create table public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  from_entry_id uuid references public.entries (id) on delete set null,
  to_entry_id uuid not null references public.entries (id) on delete cascade,
  note text check (char_length(note) <= 280),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user <> to_user)
);
create unique index partner_requests_open_idx
  on public.partner_requests (from_user, to_entry_id)
  where status in ('pending', 'accepted');
create index partner_requests_to_idx on public.partner_requests (to_user, status);

-- ---------------------------------------------------------------------------
-- Lock-ins: the ticket holder (or relay captain) confirms a partner
-- ---------------------------------------------------------------------------

create table public.lockins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  anchor_entry_id uuid not null references public.entries (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'declined', 'cancelled')),
  -- Names shared with the organiser for the start list, with consent.
  proposer_full_name text check (char_length(proposer_full_name) <= 80),
  partner_full_name text check (char_length(partner_full_name) <= 80),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check (proposer_id <> partner_id)
);
create unique index lockins_open_idx
  on public.lockins (anchor_entry_id, partner_id)
  where status in ('proposed', 'confirmed');

-- ---------------------------------------------------------------------------
-- Views used by the app to see other people
-- ---------------------------------------------------------------------------

-- These views run as their owner, so they can read profiles past RLS. They
-- only return rows to signed-in users, never return date of birth, and drop
-- anyone blocked either way.
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
  a.best_race_time
from public.entries e
join public.athlete_profiles a on a.id = e.user_id
left join public.categories c on c.id = e.category_id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.organisers enable row level security;
alter table public.events enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.partner_requests enable row level security;
alter table public.lockins enable row level security;

-- Event data is public so the landing page can show it.
create policy "organisers are public" on public.organisers for select using (true);
create policy "events are public" on public.events for select using (true);
create policy "categories are public" on public.categories for select using (true);

-- Profiles: only your own row directly; others through athlete_profiles.
create policy "read own profile" on public.profiles for select
  to authenticated using (id = auth.uid());
create policy "create own profile" on public.profiles for insert
  to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Entries: your own directly; others through feed_entries.
create policy "read own entries" on public.entries for select
  to authenticated using (user_id = auth.uid());
create policy "create own entries" on public.entries for insert
  to authenticated with check (user_id = auth.uid());
create policy "update own entries" on public.entries for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own entries" on public.entries for delete
  to authenticated using (user_id = auth.uid());

create policy "read own blocks" on public.blocks for select
  to authenticated using (blocker_id = auth.uid());
create policy "block someone" on public.blocks for insert
  to authenticated with check (blocker_id = auth.uid());
create policy "unblock someone" on public.blocks for delete
  to authenticated using (blocker_id = auth.uid());

create policy "file a report" on public.reports for insert
  to authenticated with check (reporter_id = auth.uid());
create policy "read own reports" on public.reports for select
  to authenticated using (reporter_id = auth.uid());

create policy "members read conversations" on public.conversations for select
  to authenticated using (public.is_member(id));

create policy "members see each other" on public.conversation_members for select
  to authenticated using (public.is_member(conversation_id));
create policy "mark own chat read" on public.conversation_members for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read messages" on public.messages for select
  to authenticated using (public.is_member(conversation_id));
create policy "members send messages" on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid()
    and public.is_member(conversation_id)
    and not public.chat_has_block(conversation_id, auth.uid())
  );

create policy "read own requests" on public.partner_requests for select
  to authenticated using (from_user = auth.uid() or to_user = auth.uid());

create policy "members read lock-ins" on public.lockins for select
  to authenticated using (public.is_member(conversation_id));

-- Table privileges. RLS decides rows; these decide which actions exist at all.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.organisers, public.events, public.categories to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.entries to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.partner_requests to authenticated;
grant select on public.lockins to authenticated;
grant select on public.athlete_profiles, public.feed_entries to authenticated;

-- ---------------------------------------------------------------------------
-- Actions (called from the app with supabase.rpc)
-- ---------------------------------------------------------------------------

create function public.send_partner_request(p_to_entry uuid, p_note text default null)
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

create function public.withdraw_partner_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.partner_requests
  set status = 'withdrawn', responded_at = now()
  where id = p_request and from_user = auth.uid() and status = 'pending';
  if not found then raise exception 'That request can no longer be withdrawn.'; end if;
end $$;

-- Accepting opens a chat: a pair chat, or the relay team's group chat.
create function public.respond_to_partner_request(p_request uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  req public.partner_requests;
  target public.entries;
  is_team boolean;
  conv uuid;
begin
  select * into req from public.partner_requests where id = p_request for update;
  if not found or req.to_user <> me then raise exception 'Request not found.'; end if;
  if req.status <> 'pending' then raise exception 'This request has already been answered.'; end if;

  if not p_accept then
    update public.partner_requests set status = 'declined', responded_at = now() where id = req.id;
    return null;
  end if;

  if public.is_blocked_between(req.from_user, req.to_user) then
    raise exception 'You cannot chat with this athlete.';
  end if;

  select * into target from public.entries where id = req.to_entry_id;
  select coalesce(c.team_size = 4, false) into is_team
  from public.categories c where c.id = target.category_id;
  is_team := coalesce(is_team, false) and target.has_ticket;

  if is_team then
    select id into conv from public.conversations where team_entry_id = target.id;
    if conv is null then
      insert into public.conversations (event_id, kind, team_entry_id)
      values (req.event_id, 'team', target.id) returning id into conv;
      insert into public.conversation_members (conversation_id, user_id)
      values (conv, target.user_id);
    end if;
  else
    -- Reuse an existing pair chat between the two for this event.
    select c.id into conv
    from public.conversations c
    join public.conversation_members a on a.conversation_id = c.id and a.user_id = req.from_user
    join public.conversation_members b on b.conversation_id = c.id and b.user_id = req.to_user
    where c.event_id = req.event_id and c.kind = 'pair'
    limit 1;
    if conv is null then
      insert into public.conversations (event_id, kind)
      values (req.event_id, 'pair') returning id into conv;
      insert into public.conversation_members (conversation_id, user_id)
      values (conv, req.to_user);
    end if;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (conv, req.from_user)
  on conflict do nothing;

  update public.partner_requests
  set status = 'accepted', responded_at = now(), conversation_id = conv
  where id = req.id;

  return conv;
end $$;

-- The ticket holder (or relay captain) proposes locking in a partner. If
-- neither of them has a ticket, either can propose; the proposer's listing is
-- the anchor and they buy the entry together.
create function public.propose_lockin(p_conversation uuid, p_partner uuid, p_full_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  conv public.conversations;
  anchor public.entries;
  partner_entry public.entries;
  lock_id uuid;
begin
  select * into conv from public.conversations where id = p_conversation;
  if not found or not public.is_member(conv.id) then raise exception 'Chat not found.'; end if;
  if not exists (select 1 from public.conversation_members
                 where conversation_id = conv.id and user_id = p_partner) or p_partner = me then
    raise exception 'Choose someone in this chat.';
  end if;
  if public.is_blocked_between(me, p_partner) then raise exception 'You cannot lock in this athlete.'; end if;
  if nullif(btrim(p_full_name), '') is null then raise exception 'Enter your full name.'; end if;

  select * into anchor from public.entries where user_id = me and event_id = conv.event_id;
  if not found then raise exception 'Add your race listing first.'; end if;
  select * into partner_entry from public.entries where user_id = p_partner and event_id = conv.event_id;

  if conv.kind = 'team' then
    if conv.team_entry_id is distinct from anchor.id then
      raise exception 'Only the team captain can lock in relay athletes.';
    end if;
  elsif not anchor.has_ticket and coalesce(partner_entry.has_ticket, false) then
    raise exception 'The ticket holder locks in their partner.';
  end if;

  if anchor.status = 'matched' then raise exception 'Your team is already full.'; end if;

  insert into public.lockins (event_id, conversation_id, anchor_entry_id, proposer_id, partner_id, proposer_full_name)
  values (conv.event_id, conv.id, anchor.id, me, p_partner, btrim(p_full_name))
  returning id into lock_id;

  insert into public.messages (conversation_id, sender_id, body)
  values (conv.id, me, 'I''d like to lock you in as my partner. Confirm below if you''re in!');
  return lock_id;
exception
  when unique_violation then
    raise exception 'You have already asked them to lock in.';
end $$;

create function public.respond_to_lockin(p_lockin uuid, p_accept boolean, p_full_name text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  l public.lockins;
  anchor public.entries;
  filled int;
begin
  select * into l from public.lockins where id = p_lockin for update;
  if not found or l.partner_id <> me then raise exception 'Lock-in not found.'; end if;
  if l.status <> 'proposed' then raise exception 'This lock-in has already been answered.'; end if;

  if not p_accept then
    update public.lockins set status = 'declined' where id = l.id;
    return;
  end if;
  if nullif(btrim(p_full_name), '') is null then raise exception 'Enter your full name.'; end if;

  update public.lockins
  set status = 'confirmed', partner_full_name = btrim(p_full_name), confirmed_at = now()
  where id = l.id;

  select * into anchor from public.entries where id = l.anchor_entry_id for update;
  select count(*) into filled from public.lockins
  where anchor_entry_id = anchor.id and status = 'confirmed';

  -- protect_entry only lets "matched" be set through set_entry_matched.
  if filled >= anchor.spots_needed then
    perform public.set_entry_matched(anchor.id);
  end if;
  perform public.set_entry_matched(e.id)
  from public.entries e where e.user_id = me and e.event_id = l.event_id;

  insert into public.messages (conversation_id, sender_id, body)
  values (l.conversation_id, me, 'Locked in! See you on the start line.');
end $$;

create function public.cancel_lockin(p_lockin uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.lockins set status = 'cancelled'
  where id = p_lockin and proposer_id = auth.uid() and status = 'proposed';
  if not found then raise exception 'That lock-in can no longer be cancelled.'; end if;
end $$;

-- Internal: mark a listing matched, bypassing the user-facing guard.
create function public.set_entry_matched(p_entry uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('race_buddy.allow_match', 'on', true);
  update public.entries set status = 'matched' where id = p_entry;
  perform set_config('race_buddy.allow_match', 'off', true);
end $$;


revoke execute on function public.set_entry_matched(uuid) from public, anon, authenticated;
revoke execute on function public.is_blocked_between(uuid, uuid) from anon;
revoke execute on function public.send_partner_request(uuid, text) from public, anon;
revoke execute on function public.withdraw_partner_request(uuid) from public, anon;
revoke execute on function public.respond_to_partner_request(uuid, boolean) from public, anon;
revoke execute on function public.propose_lockin(uuid, uuid, text) from public, anon;
revoke execute on function public.respond_to_lockin(uuid, boolean, text) from public, anon;
revoke execute on function public.cancel_lockin(uuid) from public, anon;
grant execute on function public.send_partner_request(uuid, text) to authenticated;
grant execute on function public.withdraw_partner_request(uuid) to authenticated;
grant execute on function public.respond_to_partner_request(uuid, boolean) to authenticated;
grant execute on function public.propose_lockin(uuid, uuid, text) to authenticated;
grant execute on function public.respond_to_lockin(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_lockin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Live chat and profile photos
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.lockins;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Each person can only write photos inside a folder named after their id.
create policy "upload own photo" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "replace own photo" on storage.objects for update
  to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "delete own photo" on storage.objects for delete
  to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
