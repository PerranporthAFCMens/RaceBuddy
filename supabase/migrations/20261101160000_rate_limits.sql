-- Rate limits, so nobody can flood people with messages, requests or
-- reports, or guess Ticket Tailor order numbers. Limits are far above what a
-- real person needs. Only adds rules, so it works with dev and main code.

create index if not exists messages_sender_idx on public.messages (sender_id, created_at);
create index if not exists partner_requests_from_idx on public.partner_requests (from_user, created_at);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at);

create function public.enforce_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  slow constant text := 'Slow down: that''s a lot in a short time. Wait a few minutes and try again.';
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if tg_table_name = 'messages' then
    if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20
      or (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 hour') >= 300 then
      raise exception '%', slow using errcode = 'P0429';
    end if;
  elsif tg_table_name = 'partner_requests' then
    if (select count(*) from public.partner_requests where from_user = new.from_user and created_at > now() - interval '1 hour') >= 20
      or (select count(*) from public.partner_requests where from_user = new.from_user and created_at > now() - interval '1 day') >= 50 then
      raise exception '%', slow using errcode = 'P0429';
    end if;
  elsif tg_table_name = 'reports' then
    if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
      raise exception '%', slow using errcode = 'P0429';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.enforce_rate_limit() from public, anon, authenticated;

create trigger messages_rate_limit before insert on public.messages
for each row execute function public.enforce_rate_limit();
create trigger partner_requests_rate_limit before insert on public.partner_requests
for each row execute function public.enforce_rate_limit();
create trigger reports_rate_limit before insert on public.reports
for each row execute function public.enforce_rate_limit();

-- Ticket Tailor order checks, counted by the server (service role) only.
create table public.ticket_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  checked_at timestamptz not null default now()
);
create index ticket_checks_user_idx on public.ticket_checks (user_id, checked_at);
alter table public.ticket_checks enable row level security;
revoke all on public.ticket_checks from anon, authenticated;
