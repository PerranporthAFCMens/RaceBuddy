-- Undoes 20261030120000_test_race.sql. Deleting the organiser removes the
-- test race, its categories, and any test listings, chats and requests on it.
begin;
delete from public.organisers where slug = 'race-buddy-test';
alter table public.events drop column if exists is_test;
commit;
