-- Starter data: KeltX and the Exeter 2027 race, with the adult race
-- categories from Ticket Tailor (ticket type ids kept so tickets can be
-- checked). `npm run sync:tickettailor` refreshes this from the live API.

insert into public.organisers (slug, name, website_url, theme)
values ('keltx', 'KeltX', 'https://www.keltx.co.uk',
        '{"accent": "#C09B2F", "background": "#000000", "foreground": "#FFFFFF"}')
on conflict (slug) do nothing;

insert into public.events (organiser_id, slug, name, venue, starts_on, ends_on, tt_event_id, ticket_url, name_change_cutoff)
select o.id, 'keltx-exeter-2027', 'KeltX Exeter', 'Westpoint Arena, Exeter',
       date '2027-03-26', date '2027-03-27', 'ev_9383540',
       'https://www.tickettailor.com/events/keltxuk/2501166', date '2027-03-19'
from public.organisers o where o.slug = 'keltx'
on conflict (slug) do nothing;

insert into public.categories (event_id, name, division, gender, race_day, team_size, tt_ticket_type_id, sort_order)
select e.id, v.name, v.division, v.gender, v.race_day, v.team_size, v.tt, v.sort_order
from public.events e
cross join (values
  ('Female Doubles',          'doubles',  'female', 'Friday',         2, 'tt_7001168', 10),
  ('Mixed Doubles',           'doubles',  'mixed',  'Friday',         2, 'tt_7001167', 11),
  ('Male Doubles',            'doubles',  'male',   'Friday',         2, 'tt_7001166', 12),
  ('Female Pro Doubles',      'pro',      'female', 'Friday',         2, 'tt_7001176', 20),
  ('Male Pro Doubles',        'pro',      'male',   'Friday',         2, 'tt_7001175', 21),
  ('Male Relay',              'relay',    'male',   'Friday Evening', 4, 'tt_7001163', 30),
  ('Mixed Relay',             'relay',    'mixed',  'Friday Evening', 4, 'tt_7001164', 31),
  ('Female Relay',            'relay',    'female', 'Friday Evening', 4, 'tt_7001165', 32),
  ('Male Doubles',            'doubles',  'male',   'Saturday',       2, 'tt_7001179', 40),
  ('Mixed Doubles',           'doubles',  'mixed',  'Saturday',       2, 'tt_7001178', 41),
  ('Female Doubles',          'doubles',  'female', 'Saturday',       2, 'tt_7001177', 42),
  ('Adaptive Male Doubles',   'adaptive', 'male',   'Saturday',       2, 'tt_7001180', 50),
  ('Adaptive Female Doubles', 'adaptive', 'female', 'Saturday',       2, 'tt_7001181', 51),
  ('Adaptive Mixed Doubles',  'adaptive', 'mixed',  'Saturday',       2, 'tt_7001182', 52)
) as v(name, division, gender, race_day, team_size, tt, sort_order)
where e.slug = 'keltx-exeter-2027'
on conflict (event_id, tt_ticket_type_id) do nothing;
