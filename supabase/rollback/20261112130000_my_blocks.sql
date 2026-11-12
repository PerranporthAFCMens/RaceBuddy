-- Undoes 20261112130000_my_blocks.sql. Blocks themselves are kept.
begin;
drop function public.my_blocks();
commit;
