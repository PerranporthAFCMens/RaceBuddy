-- Chat upgrade: emoji reactions, replying to a message, and live updates for
-- "Seen" and new requests.
--
-- Only adds things, so it works with the code on both dev and main (main's
-- code ignores the new column and table).

-- 1. Reply to a message. The reply must be in the same chat.
alter table public.messages
  add column reply_to_id uuid references public.messages (id) on delete set null;

create function public.check_message_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.messages
    where id = new.reply_to_id and conversation_id = new.conversation_id
  ) then
    raise exception 'You can only reply to a message in this chat.';
  end if;
  return new;
end $$;
revoke execute on function public.check_message_reply() from public, anon, authenticated;

create trigger messages_check_reply before insert on public.messages
for each row execute function public.check_message_reply();

-- 2. Reactions: a short fixed set of emoji, once each per person per message.
--    The row has its own random id, so the live "removed" event (which every
--    signed-in listener gets) gives nothing away about who reacted to what.
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🔥', '💪', '🙌')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index message_reactions_conversation_idx on public.message_reactions (conversation_id);
create index message_reactions_user_idx on public.message_reactions (user_id, created_at);

-- The chat comes from the message, never from the browser. Also a rate limit.
create function public.prepare_message_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select conversation_id into new.conversation_id from public.messages where id = new.message_id;
  if new.conversation_id is null then
    raise exception 'That message no longer exists.';
  end if;
  if coalesce(auth.role(), '') <> 'service_role' and (
    select count(*) from public.message_reactions
    where user_id = new.user_id and created_at > now() - interval '1 minute'
  ) >= 60 then
    raise exception 'Slow down: that''s a lot in a short time. Wait a few minutes and try again.' using errcode = 'P0429';
  end if;
  return new;
end $$;
revoke execute on function public.prepare_message_reaction() from public, anon, authenticated;

create trigger message_reactions_prepare before insert on public.message_reactions
for each row execute function public.prepare_message_reaction();

alter table public.message_reactions enable row level security;

create policy "members read reactions" on public.message_reactions for select
  to authenticated using (public.is_member(conversation_id));
create policy "members react" on public.message_reactions for insert
  to authenticated with check (
    user_id = auth.uid()
    and public.is_member(conversation_id)
    and not public.chat_has_block(conversation_id, auth.uid())
  );
create policy "remove own reaction" on public.message_reactions for delete
  to authenticated using (user_id = auth.uid());

-- Supabase grants new tables to everyone; keep only what's needed.
revoke all on public.message_reactions from public, anon, authenticated;
grant select, insert, delete on public.message_reactions to authenticated;

-- 3. Live updates. Row rules still decide who gets each change.
--    conversation_members: "Seen" when the other person reads.
--    partner_requests: the Requests count on the bottom bar.
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.partner_requests;
