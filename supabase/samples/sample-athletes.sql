-- 30 made-up athletes on the Test Race, so you can see what browsing and
-- matches look like on the dev site.
--
-- Safe for the live site: they only have listings on the Test Race, which the
-- live site never shows. They cannot sign in (no password, unreachable
-- .invalid email addresses) and never get match emails.
--
-- Run it again any time: it removes the old samples first.
-- To remove them: sample-athletes-remove.sql.

begin;

-- Start clean. Deleting the account removes the profile, listing, requests
-- and chats with it.
delete from auth.users
where email like 'sample-athlete-%@example.invalid'
  and raw_app_meta_data ->> 'sample' = 'true';

create temporary table sample_athletes (
  n int, first_name text, age int, region text, home_town text, travel_miles int,
  gym text, five_k_seconds int, best_race_time text, bio text,
  situation text, category text, spots_needed int, team_name text, stations text, note text
) on commit drop;

insert into sample_athletes values
  ( 1, 'Jess', 29, 'Cornwall', 'Truro', 30, 'Kernow Strength Co', 1395, '1:18:40',
       'Ex-hockey player. Love sleds, hate wall balls. Looking for someone who will push the pace on the runs.',
       'spare_spot', 'd', 1, null, null, 'Partner''s done their knee. Mixed doubles, Saturday.'),
  ( 2, 'Tom', 34, 'Cornwall', 'Newquay', 40, 'Atlantic Barbell', 1290, '1:12:05',
       'Runner first, slowly learning to love the burpee broad jumps.',
       'spare_spot', 'd', 1, null, null, 'Need a female partner, 5km around 22-26 mins ideal.'),
  ( 3, 'Kirsty', 41, 'Devon', 'Exeter', 60, 'Riverside Functional', 1560, '1:31:20',
       'Mum of two, train at 6am most days. Steady and consistent, never stop moving.',
       'spare_spot', 'd', 1, null, null, 'Teammate moved abroad. Happy to train together before race day.'),
  ( 4, 'Dan', 27, 'Devon', 'Plymouth', 50, 'Sound Strength', 1185, '1:04:55',
       'Competitive but friendly. Strong on the rower and ski erg.',
       'spare_spot', 'd', 1, null, null, 'Want to go sub 1:05 this time. Fast runners please!'),
  ( 5, 'Megan', 32, 'Somerset', 'Taunton', 70, 'Vale Fitness Club', 1470, '1:24:10',
       'Physio by day. Good at pacing, terrible at lunges.',
       'spare_spot', 'd', 1, null, null, null),
  ( 6, 'Rob', 45, 'Cornwall', 'Penzance', 25, 'West End Gym', 1680, '1:38:30',
       'First did one of these at 43 and got hooked. Here for fun and a medal.',
       'spare_spot', 'd', 1, null, null, 'Relaxed about times, just want to finish strong.'),
  ( 7, 'Hannah', 24, 'Bristol & Gloucestershire', 'Bristol', 100, 'Harbourside Athletics', 1260, '1:09:45',
       'Uni rower. Happy to do the heavy stations.',
       'spare_spot', 'd', 1, null, null, 'Partner injured. Will travel and can share a room cost.'),
  ( 8, 'Ollie', 38, 'Cornwall', 'St Austell', 35, 'Clay Country CrossFit', 1500, '1:27:00',
       'Coach at a small box. Calm under pressure.',
       'spare_spot', 'd', 1, null, null, null),
  ( 9, 'Lou', 36, 'Cornwall', 'Falmouth', 30, 'Harbour Strength', 1440, '1:21:15',
       'Captain of a relay team that''s lost two people to a stag do. Fun crowd.',
       'spare_spot', 'r', 2, 'Falmouth Flyers', 'Sled push and wall balls', 'Two spots. Bring snacks.'),
  (10, 'Sam', 30, 'Devon', 'Torquay', 50, 'Bay Fitness', 1350, '1:15:30',
       'Love a team event. We''re organised, we have a group chat and a plan.',
       'spare_spot', 'r', 1, 'Bay Barbell Club', 'Ski erg and rowing', 'One spot left after a late drop out.'),
  (11, 'Gareth', 49, 'Wales', 'Cardiff', 150, 'Taff Strength', 1740, '1:42:00',
       'Veteran of loads of these. Relay is the best day out.',
       'spare_spot', 'r', 3, 'Valleys Veterans', 'Any', 'Just me left! Looking for three to make a team.'),
  (12, 'Priya', 28, 'Cornwall', 'Bodmin', 40, 'Moor Fit', 1320, '1:13:50',
       'Night shift nurse, train whenever I can. Very reliable.',
       'spare_spot', 'r', 1, 'Bodmin Beasts', 'Farmers carry and sandbag lunges', null),
  (13, 'Chloe', 26, 'Cornwall', 'Truro', 20, 'Kernow Strength Co', 1410, '1:19:30',
       'Just started racing this year. Keen to learn and train together.',
       'need_spot', null, 1, null, null, 'No ticket, happy to pay the name change fee.'),
  (14, 'Jake', 31, 'Devon', 'Barnstaple', 80, 'North Coast Gym', 1230, '1:07:20',
       'Former rugby player. Big engine, decent runner.',
       'need_spot', null, 1, null, null, 'Fit, reliable, can take any spot.'),
  (15, 'Ellie', 35, 'Cornwall', 'Redruth', 25, null, 1620, null,
       'Never done one but been training for months. Love a challenge.',
       'need_spot', null, 1, null, null, 'First race, will not let you down.'),
  (16, 'Marcus', 42, 'Somerset', 'Bridgwater', 60, 'Iron Levels Gym', 1530, '1:29:45',
       'Masters age group regular. Love the sled.',
       'need_spot', null, 1, null, null, null),
  (17, 'Zoe', 23, 'Cornwall', 'Newquay', 30, 'Atlantic Barbell', 1275, '1:10:10',
       'Surf in the summer, race in the winter.',
       'need_spot', null, 1, null, null, 'Would love a relay spot too.'),
  (18, 'Ben', 39, 'Dorset', 'Weymouth', 120, 'Jurassic Fitness', 1455, '1:22:40',
       'Dad, plumber, wall ball enthusiast.',
       'need_spot', null, 1, null, null, 'Can travel, have a van!'),
  (19, 'Amy', 33, 'Devon', 'Exeter', 40, 'Riverside Functional', 1365, '1:16:00',
       'Love structured training. Happy to share plans.',
       'need_spot', null, 1, null, null, null),
  (20, 'Liam', 29, 'Cornwall', 'Camborne', 30, 'West End Gym', 1215, '1:06:30',
       'Quick on the runs, getting stronger on the carries.',
       'need_spot', null, 1, null, null, 'Doubles or relay, either is fine.'),
  (21, 'Sophie', 44, 'Cornwall', 'Wadebridge', 40, 'Camel Fitness', 1590, '1:33:10',
       'Back racing after a break. Here to enjoy it.',
       'need_spot', null, 1, null, null, null),
  (22, 'Callum', 25, 'Bristol & Gloucestershire', 'Gloucester', 100, null, 1305, null,
       'Gym regular, new to racing. Happy on any station.',
       'need_spot', null, 1, null, null, 'Would need to train together a few times first.'),
  (23, 'Rachel', 37, 'Cornwall', 'Launceston', 50, 'Moor Fit', 1500, '1:26:20',
       'Teacher. Organised, positive and very punctual.',
       'single', null, 1, null, null, 'Looking for another single to enter mixed doubles with.'),
  (24, 'Josh', 30, 'Devon', 'Plymouth', 60, 'Sound Strength', 1245, '1:08:50',
       'Want someone who can hold 5 min/km on the runs.',
       'single', null, 1, null, null, null),
  (25, 'Fran', 46, 'Somerset', 'Yeovil', 80, 'Vale Fitness Club', 1650, '1:36:40',
       'Love the atmosphere at these. Not too serious.',
       'single', null, 1, null, null, 'Mixed doubles, Saturday preferred.'),
  (26, 'Mike', 52, 'Cornwall', 'Helston', 30, 'West End Gym', 1800, '1:48:15',
       'Oldest and slowest but I never quit.',
       'single', null, 1, null, null, 'Anyone welcome, I just want to get round.'),
  (27, 'Laura', 31, 'Cornwall', 'Truro', 25, 'Kernow Strength Co', 1380, '1:17:25',
       'Strong on lunges, fine on everything else.',
       'single', null, 1, null, null, null),
  (28, 'Ryan', 28, 'Wales', 'Swansea', 150, 'Gower Fitness', 1200, '1:05:40',
       'Will travel for a good partner. Competitive.',
       'single', null, 1, null, null, 'Want a podium push.'),
  (29, 'Nina', 34, 'Devon', 'Totnes', 50, null, 1485, null,
       'Yoga teacher getting into racing. Flexible in every sense.',
       'single', null, 1, null, null, 'Doubles or relay.'),
  (30, 'Steve', 40, 'Cornwall', 'Bude', 45, 'Atlantic Barbell', 1425, '1:20:50',
       'Firefighter. Good at carrying heavy things.',
       'single', null, 1, null, null, null);

-- Accounts. Ids are fixed (5a4d0000-...-0000000000NN) so they are easy to spot.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  format('5a4d0000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  format('sample-athlete-%s@example.invalid', lpad(n::text, 2, '0')),
  '', now(),
  '{"provider": "email", "providers": ["email"], "sample": true}'::jsonb,
  '{}'::jsonb,
  now() - (n || ' hours')::interval, now(),
  '', '', '', ''
from sample_athletes;

-- Profiles. Birthdays are spread through the year so ages look natural.
insert into public.profiles (
  id, first_name, date_of_birth, bio, gym, home_town, region, travel_miles,
  five_k_seconds, best_race_time
)
select
  format('5a4d0000-0000-4000-8000-%s', lpad(n::text, 12, '0'))::uuid,
  first_name,
  (current_date - make_interval(years => age) - make_interval(days => (n * 37) % 300 + 1))::date,
  bio, gym, home_town, region, travel_miles, five_k_seconds, best_race_time
from sample_athletes;

-- Listings on the Test Race.
--   spare_spot  has a ticket (doubles or relay) and needs a partner or teammates
--   need_spot   no ticket, wants a spot on someone's team
--   single      no ticket, wants another single to enter with
insert into public.entries (
  user_id, event_id, has_ticket, category_id, wanted_category_ids, team_name,
  spots_needed, stations, race_days, note, situation, partner_five_k_range,
  alerts_email, created_at
)
select
  format('5a4d0000-0000-4000-8000-%s', lpad(s.n::text, 12, '0'))::uuid,
  e.id,
  s.situation = 'spare_spot',
  case s.category when 'd' then d.id when 'r' then r.id end,
  case
    when s.situation = 'spare_spot' then '{}'::uuid[]
    when s.situation = 'single' then array[d.id]
    when s.n % 3 = 0 then array[r.id]
    when s.n % 3 = 1 then array[d.id, r.id]
    else array[d.id]
  end,
  s.team_name,
  s.spots_needed,
  s.stations,
  case when s.situation = 'spare_spot' then '{}'::text[] else array['Saturday'] end,
  s.note,
  s.situation,
  case when s.n % 4 = 0 then 300 end,
  false,
  now() - (s.n * 5 || ' hours')::interval
from sample_athletes s
join public.events e on e.slug = 'test-race'
join public.categories d on d.event_id = e.id and d.tt_ticket_type_id = 'test_mixed_doubles'
join public.categories r on r.event_id = e.id and r.tt_ticket_type_id = 'test_mixed_relay';

-- Adding listings queues match emails for real people with a Test Race
-- listing. Mark those as already sent so nobody is emailed about samples.
update public.match_alerts
set emailed_at = now()
where emailed_at is null
  and match_entry_id in (
    select id from public.entries
    where user_id::text like '5a4d0000-0000-4000-8000-%'
  );

commit;

-- Should show: 30 profiles, 30 listings.
select
  (select count(*) from public.profiles where id::text like '5a4d0000-0000-4000-8000-%') as sample_profiles,
  (select count(*) from public.entries where user_id::text like '5a4d0000-0000-4000-8000-%') as sample_listings;
