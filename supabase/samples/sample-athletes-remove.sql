-- Removes the 30 sample athletes added by sample-athletes.sql.
-- Deleting each account removes its profile, listing, requests and chats too.
-- Only touches accounts that are both marked as samples and use the
-- sample-athlete-NN@example.invalid addresses.

delete from auth.users
where email like 'sample-athlete-%@example.invalid'
  and raw_app_meta_data ->> 'sample' = 'true';

-- Should show: 0 profiles.
select count(*) as sample_profiles_left
from public.profiles
where id::text like '5a4d0000-0000-4000-8000-%';
