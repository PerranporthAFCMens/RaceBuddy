-- Undoes 20261101160000_rate_limits.sql.
drop table if exists public.ticket_checks;
drop trigger if exists messages_rate_limit on public.messages;
drop trigger if exists partner_requests_rate_limit on public.partner_requests;
drop trigger if exists reports_rate_limit on public.reports;
drop function if exists public.enforce_rate_limit();
drop index if exists public.messages_sender_idx;
drop index if exists public.partner_requests_from_idx;
drop index if exists public.reports_reporter_idx;
