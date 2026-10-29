-- Rule tests: run by run-tests.sh after the migration and seed.
-- Each block acts as one signed-in person and checks what they can do.

\set tom   '11111111-1111-1111-1111-111111111111'
\set jess  '22222222-2222-2222-2222-222222222222'
\set cara  '33333333-3333-3333-3333-333333333333'
\set dan   '44444444-4444-4444-4444-444444444444'
\set kid   '55555555-5555-5555-5555-555555555555'

insert into auth.users (id, email) values
  (:'tom', 'tom@example.com'), (:'jess', 'jess@example.com'),
  (:'cara', 'cara@example.com'), (:'dan', 'dan@example.com'),
  (:'kid', 'kid@example.com');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, false),
         set_config('request.jwt.claim.role', 'authenticated', false);
$$;

create function pg_temp.expect_error(sql text, needle text) returns void
language plpgsql as $$
begin
  execute sql;
  raise exception 'Expected an error containing "%" from: %', needle, sql;
exception when others then
  if position(needle in sqlerrm) = 0 then
    raise exception 'Expected "%" but got "%" from: %', needle, sqlerrm, sql;
  end if;
end $$;

grant execute on all functions in schema pg_temp to authenticated;

-- Profiles ------------------------------------------------------------------
select pg_temp.act_as(:'kid');
set role authenticated;
select pg_temp.expect_error(
  format($q$insert into public.profiles (id, first_name, date_of_birth) values (%L, 'Kid', current_date - interval '16 years')$q$, :'kid'),
  'adults only');
reset role;

select pg_temp.act_as(:'tom');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, home_town, five_k_seconds)
values (:'tom', 'Tom', '1992-05-01', 'Plymouth', 1310);
select pg_temp.expect_error(
  format($q$insert into public.profiles (id, first_name, date_of_birth) values (%L, 'Fake', '1990-01-01')$q$, :'jess'),
  'row-level security');
-- Tom's listing: has a Mixed Doubles Saturday ticket and tries to self-verify.
insert into public.entries (user_id, event_id, has_ticket, category_id, ticket_verified, status, order_reference)
select :'tom', e.id, true, c.id, true, 'matched', 'or_123'
from public.events e join public.categories c on c.event_id = e.id
where e.slug = 'keltx-exeter-2027' and c.tt_ticket_type_id = 'tt_7001178';
do $$ begin
  assert (select not ticket_verified and status = 'looking' from public.entries), 'self-verify blocked on insert';
end $$;
update public.entries set ticket_verified = true, status = 'matched';
do $$ begin
  assert (select not ticket_verified and status = 'looking' from public.entries), 'self-verify blocked on update';
end $$;
reset role;

-- The server (service role) can verify after checking Ticket Tailor.
select set_config('request.jwt.claim.role', 'service_role', false);
update public.entries set ticket_verified = true, verified_at = now() where user_id = :'tom';
do $$ begin
  assert (select ticket_verified from public.entries where order_reference = 'or_123'), 'service role verifies';
end $$;

-- Changing the order reference clears the badge.
select pg_temp.act_as(:'tom');
set role authenticated;
update public.entries set order_reference = 'or_999';
do $$ begin assert (select not ticket_verified from public.entries), 'badge cleared'; end $$;
reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
update public.entries set ticket_verified = true, order_reference = 'or_123' where user_id = :'tom';

-- Jess (no ticket), Cara (relay captain needing 2) and Dan (no ticket).
select pg_temp.act_as(:'jess');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, home_town) values (:'jess', 'Jess', '1997-02-02', 'Truro');
insert into public.entries (user_id, event_id, has_ticket, wanted_category_ids)
select :'jess', e.id, false, array(select id from public.categories where gender = 'mixed')
from public.events e where e.slug = 'keltx-exeter-2027';
-- Jess cannot see Tom's date of birth or raw rows, only the safe views.
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'only own profile row';
  assert (select count(*) from public.athlete_profiles) = 2, 'sees both athletes';
  assert (select age from public.athlete_profiles where first_name = 'Tom') >= 18, 'age shown';
  assert (select ticket_verified from public.feed_entries where first_name = 'Tom'), 'badge shown in feed';
end $$;
reset role;

select pg_temp.act_as(:'cara');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth) values (:'cara', 'Cara', '1988-03-03');
insert into public.entries (user_id, event_id, has_ticket, category_id, team_name, spots_needed)
select :'cara', e.id, true, c.id, 'Team Granite', 2
from public.events e join public.categories c on c.event_id = e.id
where e.slug = 'keltx-exeter-2027' and c.tt_ticket_type_id = 'tt_7001164';
reset role;

select pg_temp.act_as(:'dan');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth) values (:'dan', 'Dan', '1990-04-04');
insert into public.entries (user_id, event_id, has_ticket)
select :'dan', e.id, false from public.events e where e.slug = 'keltx-exeter-2027';
reset role;

-- Requests -------------------------------------------------------------------
select pg_temp.act_as(:'jess');
set role authenticated;
select public.send_partner_request((select id from public.feed_entries where first_name = 'Tom'), 'Free Saturday!');
select pg_temp.expect_error(
  $q$select public.send_partner_request((select id from public.feed_entries where first_name = 'Tom'), 'again')$q$,
  'already sent');
select pg_temp.expect_error(
  $q$insert into public.messages (conversation_id, sender_id, body) values (gen_random_uuid(), auth.uid(), 'hi')$q$,
  'row-level security');
select pg_temp.expect_error(
  $q$insert into public.partner_requests (event_id, from_user, to_user, to_entry_id) select event_id, auth.uid(), user_id, id from public.feed_entries limit 1$q$,
  'permission denied');
reset role;

-- Tom accepts: a pair chat opens.
select pg_temp.act_as(:'tom');
set role authenticated;
select public.respond_to_partner_request((select id from public.partner_requests where status = 'pending'), true);
do $$ begin
  assert (select count(*) from public.conversations) = 1, 'chat opened';
  assert (select count(*) from public.conversation_members) = 2, 'two members';
end $$;
insert into public.messages (conversation_id, sender_id, body)
select id, auth.uid(), 'Brilliant, want to train Thursday?' from public.conversations;

-- Jess has no ticket, so she cannot lock in Tom; Tom (ticket holder) can.
reset role;
select pg_temp.act_as(:'jess');
set role authenticated;
select pg_temp.expect_error(
  format($q$select public.propose_lockin((select id from public.conversations), %L, 'Jess Example')$q$, :'tom'),
  'ticket holder locks in');
reset role;
select pg_temp.act_as(:'tom');
set role authenticated;
select public.propose_lockin((select id from public.conversations), :'jess', 'Tom Example');
reset role;

-- Dan cannot read their chat.
select pg_temp.act_as(:'dan');
set role authenticated;
do $$ begin
  assert (select count(*) from public.messages) = 0, 'outsider sees no messages';
  assert (select count(*) from public.conversations) = 0, 'outsider sees no chats';
  assert (select count(*) from public.lockins) = 0, 'outsider sees no lock-ins';
end $$;
reset role;

select pg_temp.act_as(:'jess');
set role authenticated;
select public.respond_to_lockin((select id from public.lockins), true, 'Jess Example');
do $$ begin
  assert (select status from public.entries where user_id = auth.uid()) = 'matched', 'Jess matched';
  assert (select status from public.feed_entries where first_name = 'Tom') = 'matched', 'Tom matched';
  assert (select count(*) from public.messages) = 3, 'chat has messages';
end $$;
reset role;

-- Relay: Dan and Jess ask to join Team Granite; both land in one group chat.
select pg_temp.act_as(:'dan');
set role authenticated;
select public.send_partner_request((select id from public.feed_entries where team_name = 'Team Granite'));
reset role;
select pg_temp.act_as(:'cara');
set role authenticated;
select public.respond_to_partner_request((select id from public.partner_requests where status = 'pending'), true);
do $$ begin
  assert (select kind from public.conversations) = 'team', 'team chat';
end $$;
select public.propose_lockin((select id from public.conversations), :'dan', 'Cara Example');
reset role;
select pg_temp.act_as(:'dan');
set role authenticated;
select public.respond_to_lockin((select id from public.lockins where status = 'proposed'), true, 'Dan Example');
do $$ begin
  assert (select status from public.feed_entries where team_name = 'Team Granite') = 'looking', 'team still needs 1 more';
end $$;
reset role;

-- Blocking: Dan blocks Cara, then neither sees the other and Dan can't post.
select pg_temp.act_as(:'dan');
set role authenticated;
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), :'cara');
do $$ begin
  assert (select count(*) from public.athlete_profiles where first_name = 'Cara') = 0, 'blocked hidden';
end $$;
select pg_temp.expect_error(
  $q$insert into public.messages (conversation_id, sender_id, body) select id, auth.uid(), 'hi' from public.conversations$q$,
  'row-level security');
reset role;
select pg_temp.act_as(:'cara');
set role authenticated;
do $$ begin
  assert (select count(*) from public.athlete_profiles where first_name = 'Dan') = 0, 'blocked hidden both ways';
end $$;
reset role;

-- Signed-out visitors see events but no people.
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  assert (select count(*) from public.categories) = 14, 'categories public';
end $$;
select pg_temp.expect_error($q$select * from public.feed_entries$q$, 'permission denied');
select pg_temp.expect_error($q$select * from public.profiles$q$, 'permission denied');
reset role;
