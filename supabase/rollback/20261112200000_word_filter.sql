-- Undoes 20261112200000_word_filter.sql. Nothing people wrote is touched.
begin;
drop trigger messages_word_filter on public.messages;
drop trigger profiles_word_filter on public.profiles;
drop trigger entries_word_filter on public.entries;
drop trigger partner_requests_word_filter on public.partner_requests;
drop function public.reject_blocked_words();
drop function public.has_blocked_word(text);
drop table public.blocked_words;
commit;
