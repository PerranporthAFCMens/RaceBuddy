-- A test race for trying things out, kept apart from real races.
--
-- Both sites (dev and live) share this database, so test accounts and
-- listings need a race of their own, the way HybridOS uses a test gym.
--
--   is_test = true    the dev site lists it; the live site never does
--   is_active = false so the live site's current code (which lists only
--                     active races) hides it too, before this release
--
-- Safe for the code on both dev and main: it only adds a column and rows.

alter table public.events
  add column is_test boolean not null default false;

insert into public.organisers (slug, name, website_url, theme)
values ('race-buddy-test', 'Race Buddy Test', null,
        '{"accent": "#C09B2F", "background": "#000000", "foreground": "#FFFFFF"}')
on conflict (slug) do nothing;

insert into public.events (organiser_id, slug, name, venue, starts_on, ends_on, is_active, is_test)
select o.id, 'test-race', 'Test Race (dev only)', 'Nowhere', date '2030-06-01', date '2030-06-02', false, true
from public.organisers o where o.slug = 'race-buddy-test'
on conflict (slug) do nothing;

-- Same shapes as a real race: a doubles pair and a relay team of four.
-- The ticket type ids are made up; Ticket Tailor checks are skipped for them.
insert into public.categories (event_id, name, division, gender, race_day, team_size, tt_ticket_type_id, sort_order)
select e.id, v.name, v.division, v.gender, v.race_day, v.team_size, v.tt, v.sort_order
from public.events e
cross join (values
  ('Mixed Doubles', 'doubles', 'mixed', 'Saturday', 2, 'test_mixed_doubles', 10),
  ('Mixed Relay',   'relay',   'mixed', 'Saturday', 4, 'test_mixed_relay',   20)
) as v(name, division, gender, race_day, team_size, tt, sort_order)
where e.slug = 'test-race'
on conflict (event_id, tt_ticket_type_id) do nothing;
