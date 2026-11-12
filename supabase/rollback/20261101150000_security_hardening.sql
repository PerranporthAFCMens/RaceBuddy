-- Undoes 20261101150000_security_hardening.sql.
grant execute on function public.is_blocked_between(uuid, uuid) to public;
grant execute on function public.is_member(uuid) to public;
grant execute on function public.chat_has_block(uuid, uuid) to public;
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'avatars';
