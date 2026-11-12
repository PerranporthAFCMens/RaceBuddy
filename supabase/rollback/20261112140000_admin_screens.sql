-- Undoes 20261112140000_admin_screens.sql. No data is touched.
begin;
drop function public.purge_closed_reports();
drop function public.admin_person(uuid);
drop function public.admin_reports(text);
commit;
