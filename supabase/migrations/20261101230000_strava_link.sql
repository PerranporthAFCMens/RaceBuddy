-- Strava link on profiles: athletes can show their Strava profile.
--
-- Only adds a column and adds it to the end of the athlete_profiles view, so
-- it works with the code on both dev and main (main's code just ignores it).
--
-- Accepted links (the app tidies what people paste into one of these):
--   https://www.strava.com/athletes/<number>   profile page
--   https://strava.app.link/<code>             "Share profile" link from the app

alter table public.profiles
  add column strava_url text check (
    strava_url ~ '^https://www\.strava\.com/athletes/[0-9]{1,15}$'
    or strava_url ~ '^https://strava\.app\.link/[A-Za-z0-9]{1,40}$'
  );

-- Same view as before, with strava_url added at the end.
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
  p.strava_url
from public.profiles p
where auth.uid() is not null
  and not public.is_blocked_between(auth.uid(), p.id);
