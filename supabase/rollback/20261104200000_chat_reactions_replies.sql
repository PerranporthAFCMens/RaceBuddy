-- Undoes 20261104200000_chat_reactions_replies.sql. Deletes every reaction and
-- forgets which message each reply was answering (the replies themselves stay).
-- migration-check: destructive ok (rollback)
begin;
alter publication supabase_realtime drop table public.partner_requests;
alter publication supabase_realtime drop table public.conversation_members;
alter publication supabase_realtime drop table public.message_reactions;
drop table public.message_reactions;
drop function public.prepare_message_reaction();
drop trigger messages_check_reply on public.messages;
drop function public.check_message_reply();
alter table public.messages drop column reply_to_id;
commit;
