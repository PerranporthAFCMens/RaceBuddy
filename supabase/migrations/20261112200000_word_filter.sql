-- Word filter: refuse chat messages, profiles, listings and request notes that
-- contain a blocked word (slurs and sexual terms). Apple asks for this before
-- an app with user posts can go in the App Store. Everyday swearing is allowed.
-- Matches whole words only (so "Scunthorpe" is fine), ignores case and common
-- swaps such as 0 for o, and catches simple endings such as "s" and "ing".
-- Only adds things, so it works with the code on both dev and main.

create table public.blocked_words (
  word text primary key check (word ~ '^[a-z]+( [a-z]+)*$' and char_length(word) between 2 and 40),
  added_at timestamptz not null default now()
);
alter table public.blocked_words enable row level security;
-- Nobody signed in can read the list (so it can't be worked around); add words
-- in the Supabase SQL editor: insert into public.blocked_words (word) values ('...');
revoke all on public.blocked_words from public, anon, authenticated;

insert into public.blocked_words (word) values
  ('nigger'), ('nigga'), ('faggot'), ('tranny'), ('retard'), ('spastic'), ('spaz'),
  ('paki'), ('chink'), ('gook'), ('kike'), ('wog'), ('coon'), ('wetback'), ('gyppo'),
  ('pikey'), ('raghead'), ('towelhead'),
  ('cunt'), ('whore'), ('slut'), ('pussy'), ('blowjob'), ('handjob'), ('rimjob'),
  ('cumshot'), ('bukkake'), ('porn'), ('nudes'), ('dickpic'), ('dick pic'),
  ('kys'), ('kill yourself');

create function public.has_blocked_word(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select t is not null and exists (
    select 1 from public.blocked_words w
    where translate(lower(t), '0134578@$!', 'oieastbasi')
      ~ ('(^|[^a-z])' || replace(w.word, ' ', '[^a-z]+') || '(s|es|ed|er|ers|ing)?($|[^a-z])')
  );
$$;

create function public.reject_blocked_words() returns trigger
language plpgsql security definer set search_path = public as $$
declare col text;
begin
  foreach col in array tg_argv loop
    if public.has_blocked_word(to_jsonb(new) ->> col) then
      raise exception 'That includes a word we don''t allow. Please reword it and try again.'
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end $$;

revoke execute on function public.has_blocked_word(text) from public, anon, authenticated;
revoke execute on function public.reject_blocked_words() from public, anon, authenticated;

create trigger messages_word_filter before insert or update of body on public.messages
  for each row execute function public.reject_blocked_words('body');
create trigger profiles_word_filter
  before insert or update of first_name, bio, gym, home_town, best_race_time on public.profiles
  for each row execute function public.reject_blocked_words('first_name', 'bio', 'gym', 'home_town', 'best_race_time');
create trigger entries_word_filter before insert or update of team_name, stations, note on public.entries
  for each row execute function public.reject_blocked_words('team_name', 'stations', 'note');
create trigger partner_requests_word_filter before insert or update of note on public.partner_requests
  for each row execute function public.reject_blocked_words('note');
