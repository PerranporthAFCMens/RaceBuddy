-- Safety: admins, warnings/suspensions/bans, better reports with evidence,
-- a locked date of birth, and a record of Terms acceptance.
--
-- Only adds things or loosens a delete rule (reports are now kept when an
-- account is deleted), so it works with the code on both dev and main.
-- Main's code keeps working: its chat reports get the "other" category.

-- ---------------------------------------------------------------------------
-- 1. Admins. Added by hand in the SQL editor; nobody can add themselves.
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;

-- True when the signed-in person is an admin. Used in row rules.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Account status: warned, suspended or banned. Set only by admins.
-- ---------------------------------------------------------------------------
create table public.account_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'warned', 'suspended', 'banned')),
  -- Shown to the person themselves, e.g. what the warning was for.
  message text check (char_length(message) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.account_status enable row level security;
revoke all on public.account_status from public, anon, authenticated;
grant select on public.account_status to authenticated;
create policy "read own status" on public.account_status for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

-- Banned email addresses, scrambled (sha256), so a banned person cannot sign
-- up again. Nothing else about them is kept.
create table public.banned_emails (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  banned_at timestamptz not null default now()
);
alter table public.banned_emails enable row level security;
revoke all on public.banned_emails from public, anon, authenticated;

create function public.email_hash(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select encode(sha256(convert_to(lower(btrim(email)), 'UTF8')), 'hex')
  from auth.users where id = p_user;
$$;
revoke execute on function public.email_hash(uuid) from public, anon, authenticated;

-- Suspended and banned people cannot list, request, chat, react, lock in or
-- change their profile. Reading, deleting a listing and deleting the account
-- still work. Server jobs and the SQL editor (no signed-in person) pass.
create function public.stop_restricted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and exists (
    select 1 from public.account_status
    where user_id = auth.uid() and status in ('suspended', 'banned')
  ) then
    raise exception 'Your account is suspended, so you can''t do that right now.' using errcode = 'P0403';
  end if;
  return new;
end $$;
revoke execute on function public.stop_restricted() from public, anon, authenticated;

create trigger profiles_stop_restricted before insert or update on public.profiles
for each row execute function public.stop_restricted();
create trigger entries_stop_restricted before insert or update on public.entries
for each row execute function public.stop_restricted();
create trigger partner_requests_stop_restricted before insert or update on public.partner_requests
for each row execute function public.stop_restricted();
create trigger lockins_stop_restricted before insert or update on public.lockins
for each row execute function public.stop_restricted();
create trigger messages_stop_restricted before insert on public.messages
for each row execute function public.stop_restricted();
create trigger message_reactions_stop_restricted before insert on public.message_reactions
for each row execute function public.stop_restricted();

-- Suspended and banned people disappear from browsing, like a block. Same
-- view as before with one extra line at the end.
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
  and not public.is_blocked_between(auth.uid(), p.id)
  and not exists (
    select 1 from public.account_status s
    where s.user_id = p.id and s.status in ('suspended', 'banned')
  );

-- ---------------------------------------------------------------------------
-- 3. Profiles: date of birth locked once set, Terms acceptance, bans.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column terms_version text check (char_length(terms_version) <= 20),
  add column terms_accepted_at timestamptz;

create function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.banned_emails where email_hash = public.email_hash(new.id)) then
      raise exception 'This account has been closed.' using errcode = 'P0403';
    end if;
  elsif new.date_of_birth is distinct from old.date_of_birth
        and auth.uid() is not null and not public.is_admin() then
    raise exception 'Your date of birth can''t be changed here. Contact us if it''s wrong.' using errcode = 'P0403';
  end if;
  -- The time is always the server's, never the browser's.
  if tg_op = 'INSERT' or new.terms_version is distinct from old.terms_version then
    new.terms_accepted_at := case when new.terms_version is null then null else now() end;
  else
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  return new;
end $$;
revoke execute on function public.protect_profile() from public, anon, authenticated;

create trigger profiles_protect before insert or update on public.profiles
for each row execute function public.protect_profile();

-- ---------------------------------------------------------------------------
-- 4. Reports: a category, an optional message, a priority, and kept when
--    either person deletes their account.
-- ---------------------------------------------------------------------------
alter table public.reports
  alter column reporter_id drop not null,
  alter column reported_id drop not null;
alter table public.reports drop constraint if exists reports_reporter_id_fkey;
alter table public.reports drop constraint if exists reports_reported_id_fkey;
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_reporter_id_fkey foreign key (reporter_id) references public.profiles (id) on delete set null,
  add constraint reports_reported_id_fkey foreign key (reported_id) references public.profiles (id) on delete set null,
  add constraint reports_status_check check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  add column category text not null default 'other' check (category in (
    'threat', 'harassment', 'underage', 'inappropriate_profile', 'spam_scam', 'impersonation', 'other')),
  add column message_id uuid references public.messages (id) on delete set null,
  add column priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal')),
  -- So a person who deletes their account before review can still be banned.
  add column reported_email_hash text,
  add column closed_at timestamptz;
create index reports_open_idx on public.reports (status, priority, created_at);

create policy "admins read reports" on public.reports for select
  to authenticated using (public.is_admin());

-- Checks the report makes sense and sets the priority. People can only report
-- a chat or message they are in, and only about someone in that chat.
create function public.prepare_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare msg public.messages;
begin
  if new.message_id is not null then
    select * into msg from public.messages where id = new.message_id;
    if not found then raise exception 'That message no longer exists.'; end if;
    new.conversation_id := msg.conversation_id;
    new.reported_id := msg.sender_id;
  end if;
  if new.reported_id is null then raise exception 'Choose who to report.'; end if;
  if new.conversation_id is not null and not exists (
    select 1 from public.conversation_members
    where conversation_id = new.conversation_id and user_id = new.reporter_id
  ) then
    raise exception 'You can only report a chat you are in.';
  end if;
  if new.conversation_id is not null and not exists (
    select 1 from public.conversation_members
    where conversation_id = new.conversation_id and user_id = new.reported_id
  ) then
    raise exception 'That person isn''t in this chat.';
  end if;
  if new.reported_id = new.reporter_id then raise exception 'You can''t report yourself.'; end if;
  new.priority := case
    when new.category in ('threat', 'underage') then 'urgent'
    when new.category = 'harassment' then 'high'
    else 'normal' end;
  new.status := 'open';
  new.closed_at := null;
  new.reported_email_hash := public.email_hash(new.reported_id);
  return new;
end $$;
revoke execute on function public.prepare_report() from public, anon, authenticated;

create trigger reports_prepare before insert on public.reports
for each row execute function public.prepare_report();

-- ---------------------------------------------------------------------------
-- 5. Evidence: a copy of the reported message and up to 5 before it (or the
--    last 6 messages for a chat report). Admins never browse whole chats.
-- ---------------------------------------------------------------------------
create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  message_id uuid,
  sender_id uuid,
  sender_name text,
  body text not null,
  sent_at timestamptz not null,
  is_reported boolean not null default false
);
create index report_evidence_report_idx on public.report_evidence (report_id, sent_at);
alter table public.report_evidence enable row level security;
revoke all on public.report_evidence from public, anon, authenticated;

create function public.copy_report_evidence() returns trigger
language plpgsql security definer set search_path = public as $$
declare upto timestamptz;
begin
  if new.conversation_id is null then return new; end if;
  upto := coalesce((select created_at from public.messages where id = new.message_id), 'infinity');
  insert into public.report_evidence (report_id, message_id, sender_id, sender_name, body, sent_at, is_reported)
  select new.id, m.id, m.sender_id, p.first_name, m.body, m.created_at, m.id = new.message_id
  from public.messages m left join public.profiles p on p.id = m.sender_id
  where m.conversation_id = new.conversation_id and m.created_at <= upto
  order by m.created_at desc
  limit 6;
  return new;
end $$;
revoke execute on function public.copy_report_evidence() from public, anon, authenticated;

create trigger reports_copy_evidence after insert on public.reports
for each row execute function public.copy_report_evidence();

-- Every time an admin opens evidence, who, when and why is recorded.
create table public.evidence_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  report_id uuid references public.reports (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz not null default now()
);
alter table public.evidence_access_log enable row level security;
revoke all on public.evidence_access_log from public, anon, authenticated;
grant select on public.evidence_access_log to authenticated;
create policy "admins read evidence log" on public.evidence_access_log for select
  to authenticated using (public.is_admin());

create function public.admin_report_evidence(p_report uuid, p_reason text)
returns table (sender_id uuid, sender_name text, body text, sent_at timestamptz, is_reported boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = 'P0403'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Say briefly why you need to see this.';
  end if;
  insert into public.evidence_access_log (admin_id, report_id, reason) values (auth.uid(), p_report, btrim(p_reason));
  return query
    select e.sender_id, e.sender_name, e.body, e.sent_at, e.is_reported
    from public.report_evidence e where e.report_id = p_report order by e.sent_at;
end $$;
revoke execute on function public.admin_report_evidence(uuid, text) from public, anon;
grant execute on function public.admin_report_evidence(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Moderation: every decision is logged with a note.
-- ---------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  user_id uuid,
  report_id uuid references public.reports (id) on delete set null,
  action text not null check (action in (
    'review', 'dismiss', 'resolve', 'warn', 'suspend', 'ban', 'reinstate', 'note')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index moderation_actions_user_idx on public.moderation_actions (user_id, created_at);
alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from public, anon, authenticated;
grant select on public.moderation_actions to authenticated;
create policy "admins read moderation log" on public.moderation_actions for select
  to authenticated using (public.is_admin());

-- One admin action. p_user defaults to the reported person.
--   review / dismiss / resolve: the report only
--   warn / suspend / ban / reinstate: the person (and closes the report)
--   note: just a note in the log
create function public.moderate(
  p_action text, p_report uuid default null, p_user uuid default null,
  p_note text default null, p_message text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  rep public.reports;
  who uuid := p_user;
  hash text;
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = 'P0403'; end if;
  if p_action not in ('review', 'dismiss', 'resolve', 'warn', 'suspend', 'ban', 'reinstate', 'note') then
    raise exception 'Unknown action.';
  end if;
  if p_report is not null then
    select * into rep from public.reports where id = p_report;
    if not found then raise exception 'Report not found.'; end if;
    who := coalesce(who, rep.reported_id);
  end if;
  if p_action in ('review', 'dismiss', 'resolve') and p_report is null then
    raise exception 'Choose a report.';
  end if;
  if p_action in ('warn', 'suspend', 'reinstate') and who is null then
    raise exception 'That account no longer exists.';
  end if;
  if who is not null and exists (select 1 from public.admins where user_id = who) then
    raise exception 'Admins can''t moderate an admin.';
  end if;

  if p_action in ('warn', 'suspend', 'ban', 'reinstate') and who is not null then
    insert into public.account_status (user_id, status, message, updated_at)
    values (who,
            case p_action when 'warn' then 'warned' when 'suspend' then 'suspended'
                          when 'ban' then 'banned' else 'active' end,
            nullif(btrim(coalesce(p_message, '')), ''), now())
    on conflict (user_id) do update
      set status = excluded.status, message = excluded.message, updated_at = now();
  end if;
  if p_action in ('suspend', 'ban') and who is not null then
    -- Take their listings out of browsing and match alerts.
    update public.entries set status = 'paused' where user_id = who and status = 'looking';
    update public.partner_requests set status = 'withdrawn', responded_at = now()
    where from_user = who and status = 'pending';
  end if;
  if p_action = 'ban' then
    hash := coalesce(public.email_hash(who), rep.reported_email_hash);
    if hash is not null then
      insert into public.banned_emails (email_hash) values (hash) on conflict do nothing;
    end if;
  end if;

  if p_report is not null and p_action <> 'note' then
    update public.reports set
      status = case p_action when 'review' then 'reviewing' when 'dismiss' then 'dismissed' else 'actioned' end,
      closed_at = case when p_action = 'review' then null else now() end
    where id = p_report;
  end if;

  insert into public.moderation_actions (admin_id, user_id, report_id, action, note)
  values (auth.uid(), who, p_report, p_action, nullif(btrim(coalesce(p_note, '')), ''));
end $$;
revoke execute on function public.moderate(text, uuid, uuid, text, text) from public, anon;
grant execute on function public.moderate(text, uuid, uuid, text, text) to authenticated;
