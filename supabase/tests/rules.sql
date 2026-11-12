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

-- Dan sees who he blocked (so he can unblock); Cara doesn't see that Dan blocked her.
select pg_temp.act_as(:'cara');
set role authenticated;
do $$ begin
  assert (select count(*) from public.my_blocks()) = 0, 'blocked person is not told';
end $$;
reset role;
select pg_temp.act_as(:'dan');
set role authenticated;
do $$ begin
  assert (select first_name from public.my_blocks()) = 'Cara', 'own blocked list';
end $$;
reset role;

-- Signed-out visitors see events but no people.
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false);
set role anon;
do $$ begin
  assert (select count(*) from public.categories c join public.events e on e.id = c.event_id
          where e.slug = 'keltx-exeter-2027') = 14, 'categories public';
  assert (select count(*) from public.categories) = 16, 'KeltX 14 plus the test race 2';
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

-- Test race ------------------------------------------------------------------
-- Kept apart from real races: marked as a test, inactive (so older live code
-- hides it), with its own organiser and the two category shapes.
do $$ begin
  assert exists (select 1 from public.events e join public.organisers o on o.id = e.organiser_id
                 where e.slug = 'test-race' and e.is_test and not e.is_active and o.slug = 'race-buddy-test'),
    'test race exists, is a test, is inactive, under its own organiser';
  assert (select count(*) from public.categories c join public.events e on e.id = c.event_id
          where e.slug = 'test-race') = 2, 'test race has 2 categories';
  assert not exists (select 1 from public.events where is_test and slug <> 'test-race'), 'real races are not tests';
  assert (select not is_test from public.events where slug = 'keltx-exeter-2027'), 'KeltX race is real';
end $$;

-- Signed-in people can list on the test race like a real one.
select pg_temp.act_as(:'ann');
set role authenticated;
do $$ declare ev uuid := (select id from public.events where slug = 'test-race'); begin
  assert ev is not null, 'test race visible to signed-in people';
end $$;
reset role;

-- Rate limits ------------------------------------------------------------------
-- Tom can send 20 messages a minute; the 21st is refused.
select pg_temp.act_as(:'tom');
set role authenticated;
do $$
declare conv uuid := (select c.id from public.conversations c join public.conversation_members m on m.conversation_id = c.id
                      where m.user_id = auth.uid() and c.kind = 'pair' and not public.chat_has_block(c.id, auth.uid()) limit 1);
begin
  while (select count(*) from public.messages where sender_id = auth.uid() and created_at > now() - interval '1 minute') < 20 loop
    insert into public.messages (conversation_id, sender_id, body) values (conv, auth.uid(), 'hello');
  end loop;
  perform pg_temp.expect_error(format($q$insert into public.messages (conversation_id, sender_id, body) values (%L, auth.uid(), 'one too many')$q$, conv), 'Slow down');
end $$;
reset role;

-- Dan can file 10 reports a day; the 11th is refused.
select pg_temp.act_as(:'dan');
set role authenticated;
do $$ begin
  while (select count(*) from public.reports where reporter_id = auth.uid()) < 10 loop
    insert into public.reports (reporter_id, reported_id, reason) values (auth.uid(), '11111111-1111-1111-1111-111111111111', 'test report');
  end loop;
end $$;
select pg_temp.expect_error(
  $q$insert into public.reports (reporter_id, reported_id, reason) values (auth.uid(), '11111111-1111-1111-1111-111111111111', 'one too many')$q$,
  'Slow down');
reset role;

-- People cannot read or write the order-check counter.
select pg_temp.act_as(:'tom');
set role authenticated;
select pg_temp.expect_error($q$select count(*) from public.ticket_checks$q$, 'permission denied');
reset role;

-- Strava link: only real Strava profile links are stored, and other athletes see it.
select pg_temp.act_as(:'tom');
set role authenticated;
select pg_temp.expect_error(
  $q$update public.profiles set strava_url = 'https://evil.example/athletes/1' where id = auth.uid()$q$,
  'strava_url');
select pg_temp.expect_error(
  $q$update public.profiles set strava_url = 'javascript:alert(1)' where id = auth.uid()$q$,
  'strava_url');
update public.profiles set strava_url = 'https://www.strava.com/athletes/12345' where id = auth.uid();
update public.profiles set strava_url = 'https://strava.app.link/AbC123' where id = auth.uid();
reset role;
select pg_temp.act_as(:'jess');
set role authenticated;
do $$ begin
  assert (select strava_url from public.athlete_profiles where first_name = 'Tom') = 'https://strava.app.link/AbC123', 'Strava link shown';
end $$;
reset role;

-- Results link: only links to the listed results sites are stored, and other athletes see it.
select pg_temp.act_as(:'tom');
set role authenticated;
select pg_temp.expect_error(
  $q$update public.profiles set results_url = 'https://evil.example/results.aspx' where id = auth.uid()$q$,
  'results_url');
select pg_temp.expect_error(
  $q$update public.profiles set results_url = 'https://dbmaxresults.co.uk.evil.example/' where id = auth.uid()$q$,
  'results_url');
select pg_temp.expect_error(
  $q$update public.profiles set results_url = 'javascript:alert(1)' where id = auth.uid()$q$,
  'results_url');
update public.profiles set results_url = 'https://dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029' where id = auth.uid();
reset role;
select pg_temp.act_as(:'jess');
set role authenticated;
do $$ begin
  assert (select results_url from public.athlete_profiles where first_name = 'Tom') = 'https://dbmaxresults.co.uk/results.aspx?CId=16421&RId=10029', 'Results link shown';
end $$;
reset role;

-- Reactions and replies -------------------------------------------------------
-- A message in the team chat, to check replies can't point across chats.
insert into public.messages (conversation_id, sender_id, body)
select id, :'cara', 'Team only' from public.conversations where kind = 'team';
select id as team_msg from public.messages where body = 'Team only' \gset
select id as pair_msg from public.messages where body = 'Brilliant, want to train Thursday?' \gset

select pg_temp.act_as(:'jess');
set role authenticated;
-- Jess reacts to Tom's message. The chat id is taken from the message, not from her.
insert into public.message_reactions (message_id, conversation_id, emoji)
select id, gen_random_uuid(), '👍' from public.messages where body = 'Brilliant, want to train Thursday?';
do $$ begin
  assert (select r.conversation_id = m.conversation_id from public.message_reactions r join public.messages m on m.id = r.message_id),
    'reaction belongs to the message''s chat';
end $$;
select pg_temp.expect_error(
  $q$insert into public.message_reactions (message_id, emoji) select id, '👍' from public.messages where body = 'Brilliant, want to train Thursday?'$q$,
  'duplicate key');
select pg_temp.expect_error(
  $q$insert into public.message_reactions (message_id, emoji) select id, '💩' from public.messages where body = 'Brilliant, want to train Thursday?'$q$,
  'message_reactions_emoji_check');
select pg_temp.expect_error(
  format($q$insert into public.message_reactions (message_id, user_id, emoji) select id, %L, '🔥' from public.messages where body = 'Brilliant, want to train Thursday?'$q$, :'tom'),
  'row-level security');
-- Replies: fine in the same chat, refused across chats.
insert into public.messages (conversation_id, sender_id, body, reply_to_id)
select conversation_id, auth.uid(), 'Thursday works', id from public.messages where body = 'Brilliant, want to train Thursday?';
select pg_temp.expect_error(
  format($q$insert into public.messages (conversation_id, sender_id, body, reply_to_id) select id, auth.uid(), 'sneaky', %L from public.conversations where kind = 'pair'$q$, :'team_msg'),
  'only reply to a message in this chat');
reset role;

-- Outsiders can't see or add reactions; nobody can remove someone else's.
select pg_temp.act_as(:'dan');
set role authenticated;
do $$ begin
  assert (select count(*) from public.message_reactions) = 0, 'outsider sees no reactions';
end $$;
select pg_temp.expect_error(
  format($q$insert into public.message_reactions (message_id, emoji) values (%L, '👍')$q$, :'pair_msg'),
  'row-level security');
reset role;

select pg_temp.act_as(:'tom');
set role authenticated;
delete from public.message_reactions;
do $$ begin
  assert (select count(*) from public.message_reactions) = 1, 'Tom sees the reaction but cannot remove it';
end $$;
reset role;
select pg_temp.act_as(:'jess');
set role authenticated;
delete from public.message_reactions;
do $$ begin
  assert (select count(*) from public.message_reactions) = 0, 'Jess removes her own reaction';
end $$;
reset role;

-- Safety: date of birth lock, Terms, reports, evidence, moderation ----------
\set ria 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set sam 'cccccccc-cccc-cccc-cccc-cccccccccccc'
\set uma 'dddddddd-dddd-dddd-dddd-dddddddddddd'
insert into auth.users (id, email) values
  (:'ria', 'ria@example.com'), (:'sam', 'Sam@Example.com'), (:'uma', 'uma@example.com');
insert into public.admins (user_id) values (:'ria');

select pg_temp.act_as(:'ria');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth) values (:'ria', 'Ria', '1985-01-01');
reset role;
select pg_temp.act_as(:'uma');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth, terms_version, terms_accepted_at)
values (:'uma', 'Uma', '1995-06-06', '2026-11', '2000-01-01');
do $$ begin
  assert (select terms_accepted_at > now() - interval '1 minute' from public.profiles where id = auth.uid()),
    'Terms time comes from the server';
end $$;
-- Saving the same date of birth is fine; changing it is not.
update public.profiles set date_of_birth = '1995-06-06', bio = 'Hi' where id = auth.uid();
select pg_temp.expect_error(
  $q$update public.profiles set date_of_birth = '1990-06-06' where id = auth.uid()$q$,
  'can''t be changed');
insert into public.entries (user_id, event_id, has_ticket, category_id)
select :'uma', e.id, true, c.id
from public.events e join public.categories c on c.event_id = e.id
where e.slug = 'keltx-exeter-2027' and c.tt_ticket_type_id = 'tt_7001178';
reset role;

select pg_temp.act_as(:'sam');
set role authenticated;
insert into public.profiles (id, first_name, date_of_birth) values (:'sam', 'Sam', '1993-03-03');
insert into public.entries (user_id, event_id, has_ticket)
select :'sam', e.id, false from public.events e where e.slug = 'keltx-exeter-2027';
select public.send_partner_request((select id from public.feed_entries where first_name = 'Uma'));
reset role;
select pg_temp.act_as(:'uma');
set role authenticated;
select public.respond_to_partner_request(
  (select id from public.partner_requests where status = 'pending' and to_user = auth.uid()), true);
reset role;
select c.id as safety_conv from public.conversations c
join public.conversation_members m on m.conversation_id = c.id where m.user_id = :'sam' \gset
select pg_temp.act_as(:'sam');
set role authenticated;
insert into public.messages (conversation_id, sender_id, body) values (:'safety_conv', auth.uid(), 'Hi Uma');
insert into public.messages (conversation_id, sender_id, body) values (:'safety_conv', auth.uid(), 'I know where you live');
reset role;
select id as threat_msg from public.messages where body = 'I know where you live' \gset

-- Uma reports the message. The database fills in who and how urgent.
select pg_temp.act_as(:'uma');
set role authenticated;
select pg_temp.expect_error(
  format($q$insert into public.reports (reporter_id, message_id, category, reason) values (auth.uid(), %L, 'threat', 'not my chat')$q$, :'pair_msg'),
  'only report a chat you are in');
select pg_temp.expect_error(
  format($q$insert into public.reports (reporter_id, reported_id, conversation_id, reason) values (auth.uid(), %L, %L, 'not my chat')$q$, :'tom', :'safety_conv'),
  'isn''t in this chat');
select pg_temp.expect_error(
  $q$insert into public.reports (reporter_id, reason) values (auth.uid(), 'nobody')$q$,
  'Choose who to report');
insert into public.reports (reporter_id, message_id, category, reason, priority, status)
values (auth.uid(), :'threat_msg', 'threat', 'Threatening message', 'normal', 'dismissed');
do $$ begin
  assert (select reported_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and priority = 'urgent' and status = 'open'
          from public.reports where reporter_id = auth.uid()), 'report filled in by the database';
end $$;
-- People can't see evidence, other people's reports, or the logs, and can't moderate.
select pg_temp.expect_error($q$select count(*) from public.report_evidence$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.admins (user_id) values (auth.uid())$q$, 'permission denied');
select pg_temp.expect_error(
  $q$select * from public.admin_report_evidence((select id from public.reports limit 1), 'curious')$q$, 'Admins only');
select pg_temp.expect_error(
  format($q$select public.moderate('ban', null, %L)$q$, :'tom'), 'Admins only');
select pg_temp.expect_error($q$update public.reports set status = 'dismissed'$q$, 'permission denied');
select pg_temp.expect_error($q$select * from public.admin_reports('all')$q$, 'Admins only');
select pg_temp.expect_error(format($q$select * from public.admin_person(%L)$q$, :'sam'), 'Admins only');
select pg_temp.expect_error($q$select public.purge_closed_reports()$q$, 'permission denied');
do $$ begin
  assert (select count(*) from public.reports) = 1, 'sees only her own report';
  assert (select count(*) from public.moderation_actions) = 0, 'no moderation log';
  assert (select count(*) from public.evidence_access_log) = 0, 'no evidence log';
  assert not public.is_admin(), 'not an admin';
end $$;
reset role;
select id as threat_report from public.reports where message_id = :'threat_msg' \gset
do $$ begin
  assert (select count(*) from public.report_evidence) = 2, 'reported message and the one before';
  assert (select count(*) from public.report_evidence where is_reported) = 1, 'reported message marked';
end $$;

-- A report about a whole chat (no single message) copies its latest messages,
-- with none marked as the reported one. Removed again so later counts hold.
select pg_temp.act_as(:'uma');
set role authenticated;
insert into public.reports (reporter_id, reported_id, conversation_id, category, reason)
values (auth.uid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', :'safety_conv', 'harassment', 'Whole chat');
reset role;
do $$ begin
  assert (select count(*) from public.report_evidence e join public.reports r on r.id = e.report_id
          where r.reason = 'Whole chat') = 2, 'chat report copies the chat';
  assert not exists (select 1 from public.report_evidence e join public.reports r on r.id = e.report_id
                     where r.reason = 'Whole chat' and e.is_reported), 'no single message marked';
end $$;
delete from public.reports where reason = 'Whole chat';

-- The admin sees every report, and opening evidence needs a reason and is logged.
select pg_temp.act_as(:'ria');
set role authenticated;
do $$ begin
  assert (select count(*) from public.reports) > 10, 'admin sees all reports';
end $$;
select pg_temp.expect_error(
  format($q$select * from public.admin_report_evidence(%L, '')$q$, :'threat_report'), 'why you need');
do $$ begin
  assert (select count(*) from public.admin_report_evidence(
    (select id from public.reports where category = 'threat'), 'Reviewing urgent threat report')) = 2, 'admin sees evidence';
  assert (select count(*) from public.evidence_access_log) = 1, 'evidence view logged';
end $$;
select pg_temp.expect_error(format($q$select public.moderate('warn', null, %L)$q$, :'ria'), 'moderate an admin');
do $$ begin
  assert (select priority from public.admin_reports('open') limit 1) = 'urgent', 'urgent reports first';
  assert (select reported_name from public.admin_reports('open') where category = 'threat') = 'Sam', 'names shown to admin';
  assert (select evidence_count from public.admin_reports('open') where category = 'threat') = 2, 'evidence counted';
  assert (select reports_against from public.admin_person('cccccccc-cccc-cccc-cccc-cccccccccccc')) = 1, 'person summary';
end $$;
select public.moderate('suspend', :'threat_report', null, 'Credible threat; suspended pending review', 'Your account is suspended while we review a report.');
reset role;

-- Suspended: Sam can't message, react, request, list or edit, and is hidden.
select pg_temp.act_as(:'sam');
set role authenticated;
select pg_temp.expect_error(
  format($q$insert into public.messages (conversation_id, sender_id, body) values (%L, auth.uid(), 'still here')$q$, :'safety_conv'),
  'suspended');
select pg_temp.expect_error(
  format($q$insert into public.message_reactions (message_id, emoji) select id, '👍' from public.messages where conversation_id = %L limit 1$q$, :'safety_conv'),
  'suspended');
select pg_temp.expect_error(
  $q$select public.send_partner_request((select id from public.feed_entries where first_name = 'Ann'))$q$,
  'suspended');
select pg_temp.expect_error($q$update public.profiles set bio = 'changed' where id = auth.uid()$q$, 'suspended');
select pg_temp.expect_error($q$update public.entries set status = 'looking' where user_id = auth.uid()$q$, 'suspended');
do $$ begin
  assert (select status from public.account_status where user_id = auth.uid()) = 'suspended', 'Sam sees his status';
  assert (select status from public.entries where user_id = auth.uid()) = 'paused', 'listing paused';
end $$;
reset role;
select pg_temp.act_as(:'uma');
set role authenticated;
do $$ begin
  assert (select count(*) from public.athlete_profiles where first_name = 'Sam') = 0, 'suspended person hidden';
  assert (select count(*) from public.account_status) = 0, 'cannot see others'' status';
end $$;
reset role;
do $$ begin
  assert (select status from public.reports where message_id = (select id from public.messages where body = 'I know where you live')) = 'actioned', 'report closed';
  assert (select count(*) from public.moderation_actions where action = 'suspend') = 1, 'decision logged';
end $$;

-- Reinstated: Sam can message again. Then banned, deletes his account, and
-- can't come back with the same email. The report and evidence stay.
select pg_temp.act_as(:'ria');
set role authenticated;
select public.moderate('reinstate', null, :'sam', 'Appeal upheld');
reset role;
select pg_temp.act_as(:'sam');
set role authenticated;
insert into public.messages (conversation_id, sender_id, body) values (:'safety_conv', auth.uid(), 'Sorry');
reset role;
select pg_temp.act_as(:'ria');
set role authenticated;
select public.moderate('ban', :'threat_report', null, 'Repeat threats');
reset role;
delete from auth.users where id = :'sam';
insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', ' sam@example.com');
select pg_temp.act_as('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
set role authenticated;
select pg_temp.expect_error(
  $q$insert into public.profiles (id, first_name, date_of_birth) values (auth.uid(), 'Sam', '1993-03-03')$q$,
  'account has been closed');
reset role;
do $$ begin
  assert (select reported_id is null from public.reports where category = 'threat'), 'report kept after deletion';
  assert (select count(*) from public.report_evidence) = 2, 'evidence kept after deletion';
end $$;

-- Clean-up: closed reports older than 12 months go, with their evidence.
update public.reports set closed_at = now() - interval '13 months' where category = 'threat';
do $$ begin
  assert public.purge_closed_reports() = 1, 'old closed report purged';
  assert (select count(*) from public.report_evidence) = 0, 'its evidence went too';
end $$;
