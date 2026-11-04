-- Past results link on profiles: athletes can link to their race results
-- (for example a DB Max results page) so others can see their times.
--
-- Only adds a column and adds it to the end of the athlete_profiles view, so
-- it works with the code on both dev and main (main's code just ignores it).
-- Needs 20261101230000_strava_link.sql to have run first.
--
-- Accepted links (the app tidies what people paste into this form):
--   https://dbmaxresults.co.uk/<anything>
--   https://results.hyrox.com/<anything>
-- To allow another results site, write a new migration that changes this check
-- and add the site to src/lib/results-link.ts.

alter table public.profiles
  add column results_url text
    constraint profiles_results_url_check check (
      char_length(results_url) <= 300
      and results_url ~ '^https://(dbmaxresults\.co\.uk|results\.hyrox\.com)/[^[:space:]#<>"]*$'
    );

-- Same view as before, with results_url added at the end.
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
  and not public.is_blocked_between(auth.uid(), p.id);
