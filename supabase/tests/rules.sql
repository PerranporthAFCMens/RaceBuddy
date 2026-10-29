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

-- "Looking for" matching and alerts -----------------------------------------
\set ann '66666666-6666-6666-6666-666666666666'
\set bea '77777777-7777-7777-7777-777777777777'
\set ben '88888888-8888-8888-8888-888888888888'
\set cal '99999999-9999-9999-9999-999999999999'
\set eve 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
insert into auth.users (id, email) values
  (:'ann', 'ann@example.com'), (:'bea', 'bea@example.com'), (:'ben', 'ben@example.com'),
  (:'cal', 'cal@example.com'), (:'eve', 'eve@example.com');

-- Ann has a Mixed Doubles Saturday ticket and wants someone within 2 minutes, in Cornwall.
select pg_temp.act_as(:'ann');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, region, five_k_seconds) values (:'ann', 'Ann', '1990-01-01', 'Cornwall', 1300);
insert into public.entries (user_id, event_id, has_ticket, category_id, situation, partner_five_k_range, partner_regions)
select :'ann', e.id, true, c.id, 'single', 120, array['Cornwall']
from public.events e join public.categories c on c.event_id = e.id
where e.slug = 'keltx-exeter-2027' and c.tt_ticket_type_id = 'tt_7001178';
do $$ begin
  assert (select situation from public.entries where user_id = auth.uid()) = 'spare_spot', 'ticket means spare_spot';
end $$;
select pg_temp.expect_error($q$select public.entry_fits(gen_random_uuid(), gen_random_uuid())$q$, 'permission denied');
reset role;

-- Bea needs a spot in any mixed category: fits Ann. Ben (single, male only) does not.
-- Cal (single, mixed) is too slow for Ann. Eve (need_spot, mixed) is in Devon.
select pg_temp.act_as(:'bea');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, region, five_k_seconds) values (:'bea', 'Bea', '1991-01-01', 'Cornwall', 1380);
insert into public.entries (user_id, event_id, has_ticket, situation, wanted_category_ids)
select :'bea', e.id, false, 'need_spot', array(select id from public.categories where gender = 'mixed' and event_id = e.id)
from public.events e where e.slug = 'keltx-exeter-2027';
reset role;
select pg_temp.act_as(:'ben');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, region) values (:'ben', 'Ben', '1992-01-01', 'Cornwall');
insert into public.entries (user_id, event_id, has_ticket, situation, wanted_category_ids)
select :'ben', e.id, false, 'single', array(select id from public.categories where gender = 'male' and event_id = e.id)
from public.events e where e.slug = 'keltx-exeter-2027';
reset role;
select pg_temp.act_as(:'cal');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, region, five_k_seconds) values (:'cal', 'Cal', '1993-01-01', 'Cornwall', 2000);
insert into public.entries (user_id, event_id, has_ticket, situation, wanted_category_ids)
select :'cal', e.id, false, 'single', array(select id from public.categories where gender = 'mixed' and event_id = e.id)
from public.events e where e.slug = 'keltx-exeter-2027';
reset role;
select pg_temp.act_as(:'eve');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, region) values (:'eve', 'Eve', '1994-01-01', 'Devon');
insert into public.entries (user_id, event_id, has_ticket, situation, wanted_category_ids)
select :'eve', e.id, false, 'need_spot', array(select id from public.categories where gender = 'mixed' and event_id = e.id)
from public.events e where e.slug = 'keltx-exeter-2027';
reset role;

select pg_temp.act_as(:'ann');
set role authenticated;
do $$ declare ev uuid := (select id from public.events where slug = 'keltx-exeter-2027'); begin
  assert (select array_agg(f.first_name order by f.first_name) from public.feed_entries f
          where f.id in (select public.my_matches(ev))) = array['Bea'], 'Ann matches only Bea';
  assert (select count(*) from public.match_alerts) = 1, 'Ann has one alert';
  assert (select f.first_name from public.match_alerts m join public.feed_entries f on f.id = m.match_entry_id) = 'Bea', 'alert is for Bea';
  assert (select situation from public.feed_entries where first_name = 'Bea') = 'need_spot', 'feed shows situation';
end $$;
reset role;

-- Bea has no criteria, so she sees Ann. Two people who both need a spot don't match.
-- Cal (single) sees Ann (spare spot) but not Ben (no shared category).
select pg_temp.act_as(:'bea');
set role authenticated;
do $$ declare ev uuid := (select id from public.events where slug = 'keltx-exeter-2027'); begin
  assert (select array_agg(f.first_name order by f.first_name) from public.feed_entries f
          where f.id in (select public.my_matches(ev))) @> array['Ann'], 'Bea sees Ann';
  assert not exists (select 1 from public.feed_entries f where f.first_name = 'Eve' and f.id in (select public.my_matches(ev))), 'need_spot pairs do not match';
  assert (select count(*) from public.match_alerts) = 0, 'Bea sees no one else''s alerts';
end $$;
reset role;
select pg_temp.act_as(:'cal');
set role authenticated;
do $$ declare ev uuid := (select id from public.events where slug = 'keltx-exeter-2027'); begin
  assert exists (select 1 from public.feed_entries f where f.first_name = 'Ann' and f.id in (select public.my_matches(ev))), 'single sees spare spot';
  assert not exists (select 1 from public.feed_entries f where f.first_name = 'Ben' and f.id in (select public.my_matches(ev))), 'no shared category';
end $$;
-- Clients cannot write alerts.
select pg_temp.expect_error(
  format($q$insert into public.match_alerts (user_id, for_entry_id, match_entry_id) select %L, id, id from public.entries limit 1$q$, :'cal'),
  'permission denied');
reset role;

-- Turning alerts off stops new ones; blocked people never match.
select pg_temp.act_as(:'ann');
set role authenticated;
update public.entries set alerts_email = false where user_id = auth.uid();
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), :'bea');
do $$ declare ev uuid := (select id from public.events where slug = 'keltx-exeter-2027'); begin
  assert not exists (select 1 from public.my_matches(ev)), 'blocked Bea no longer a match';
end $$;
reset role;
