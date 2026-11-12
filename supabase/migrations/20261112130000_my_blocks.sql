-- "Blocked athletes" list on the Me page, so people can unblock.
-- Blocked people are hidden from athlete_profiles both ways, so this returns
-- just the first name of the people you blocked, and only to you.
-- Only adds a function, so it works with the code on both dev and main.
create function public.my_blocks()
returns table (user_id uuid, first_name text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked_id, p.first_name, b.created_at
  from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
revoke execute on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;
