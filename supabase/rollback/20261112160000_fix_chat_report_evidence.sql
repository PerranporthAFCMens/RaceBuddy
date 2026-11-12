-- Undoes 20261112160000_fix_chat_report_evidence.sql by restoring the earlier
-- function (which makes whole-chat reports fail again; only use if needed).
begin;
create or replace function public.copy_report_evidence() returns trigger
language plpgsql security definer set search_path = public as $$
declare upto timestamptz;
begin
  if new.conversation_id is null then return new; end if;
  upto := coalesce((select created_at from public.messages where id = new.message_id), 'infinity');
  insert into public.report_evidence (report_id, message_id, sender_id, sender_name, body, sent_at, is_reported)
  select new.id, m.id, m.sender_id, p.first_name, m.body, m.created_at, m.id = new.message_id
  from public.messages m left join public.profiles p on p.id = m.sender_id
  where m.conversation_id = new.conversation_id and m.created_at <= upto
  order by m.created_at desc
  limit 6;
  return new;
end $$;
revoke execute on function public.copy_report_evidence() from public, anon, authenticated;
commit;
