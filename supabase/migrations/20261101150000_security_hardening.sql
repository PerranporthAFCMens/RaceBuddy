-- Security hardening from the 2026-11-01 review. Only removes access, so it
-- works with the code on both dev and main.
--
-- 1. Helper functions used by the row rules were still callable by signed-out
--    visitors through Postgres's PUBLIC grant. Signed-in people keep them,
--    because the row rules and views call them as that person.
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.chat_has_block(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.chat_has_block(uuid, uuid) to authenticated;

-- 2. Profile photos: at most 2 MB, and only photo types. The app resizes
--    photos in the browser and always uploads JPEGs, so this only stops
--    uploads made around the app (for example web pages or huge files).
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
