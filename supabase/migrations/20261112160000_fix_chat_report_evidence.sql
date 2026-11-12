-- Fix: reporting a whole chat (no single message) failed when the chat had
-- messages, because "is this the reported message?" came out as null instead
-- of false. Only replaces one trigger function, so it works with the code on
-- both dev and main.
create or replace function public.copy_report_evidence() returns trigger
language plpgsql security definer set search_path = public as $$
declare upto timestamptz;
begin
  if new.conversation_id is null then return new; end if;
  upto := coalesce((select created_at from public.messages where id = new.message_id), 'infinity');
  insert into public.report_evidence (report_id, message_id, sender_id, sender_name, body, sent_at, is_reported)
  select new.id, m.id, m.sender_id, p.first_name, m.body, m.created_at, coalesce(m.id = new.message_id, false)
  from public.messages m left join public.profiles p on p.id = m.sender_id
  where m.conversation_id = new.conversation_id and m.created_at <= upto
  order by m.created_at desc
  limit 6;
  return new;
end $$;
revoke execute on function public.copy_report_evidence() from public, anon, authenticated;
