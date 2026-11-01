-- Database security rules: run by run-tests.sh after every migration.
-- Supabase lets the browser talk to the database directly, as `anon`
-- (signed out) or `authenticated` (signed in). These checks pin down exactly
-- what each of them can reach, so a new table or function that forgets to
-- lock itself down fails CI. To add access on purpose, change the lists here
-- in the same PR, and say why in the PR description.

do $$
declare bad text;
begin
  -- 1. Row level security is on for every table people can reach.
  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if bad is not null then raise exception 'Row level security is off on: %', bad; end if;

  -- 2. Signed-out visitors can only read the race list.
  select string_agg(table_name || ' ' || privilege_type, ', ' order by table_name, privilege_type) into bad
  from information_schema.role_table_grants
  where grantee in ('anon', 'PUBLIC') and table_schema = 'public'
    and (table_name, privilege_type) not in (
      ('organisers', 'SELECT'), ('events', 'SELECT'), ('categories', 'SELECT'));
  if bad is not null then raise exception 'Signed-out visitors have unexpected table access: %', bad; end if;

  -- 3. Signed-in people: exactly these table actions. Row rules then limit
  --    which rows. Anything else goes through the functions in check 5.
  with expected(t, p) as (values
    ('organisers', 'SELECT'), ('events', 'SELECT'), ('categories', 'SELECT'),
    ('profiles', 'SELECT'), ('profiles', 'INSERT'), ('profiles', 'UPDATE'),
    ('entries', 'SELECT'), ('entries', 'INSERT'), ('entries', 'UPDATE'), ('entries', 'DELETE'),
    ('blocks', 'SELECT'), ('blocks', 'INSERT'), ('blocks', 'DELETE'),
    ('reports', 'SELECT'), ('reports', 'INSERT'),
    ('conversations', 'SELECT'), ('conversation_members', 'SELECT'),
    ('messages', 'SELECT'), ('messages', 'INSERT'),
    ('partner_requests', 'SELECT'), ('lockins', 'SELECT'), ('match_alerts', 'SELECT'),
    ('athlete_profiles', 'SELECT'), ('feed_entries', 'SELECT')
  ), actual as (
    select table_name::text t, privilege_type::text p from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public'
  ), diff as (
    (select 'extra ' || t || ' ' || p d from actual except select 'extra ' || t || ' ' || p from expected)
    union all
    (select 'missing ' || t || ' ' || p from expected except select 'missing ' || t || ' ' || p from actual)
  )
  select string_agg(d, ', ' order by d) into bad from diff;
  if bad is not null then raise exception 'Signed-in table access changed: %', bad; end if;

  -- Column-only grants: just marking a chat as read.
  select string_agg(c.relname || '.' || a.attname || ' ' || a.attacl::text, ', ') into bad
  from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and a.attacl is not null
    and not (c.relname = 'conversation_members' and a.attname = 'last_read_at');
  if bad is not null then raise exception 'Unexpected column grants: %', bad; end if;

  -- 4. Functions that run with owner rights fix their search_path, so nobody
  --    can swap in their own tables or functions.
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if bad is not null then raise exception 'Owner-rights functions without a fixed search_path: %', bad; end if;

  -- 5. Functions callable from the browser. Trigger functions cannot be
  --    called directly, so they are left out.
  select string_agg(p.oid::regprocedure::text, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('anon', p.oid, 'execute');
  if bad is not null then raise exception 'Signed-out visitors can call: %', bad; end if;

  with expected(f) as (values
    ('send_partner_request'), ('withdraw_partner_request'), ('respond_to_partner_request'),
    ('propose_lockin'), ('respond_to_lockin'), ('cancel_lockin'), ('my_matches'),
    -- Used inside row rules and views, which run them as the signed-in person.
    ('is_blocked_between'), ('is_member'), ('chat_has_block')
  ), actual as (
    select p.proname::text f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')
  ), diff as (
    (select 'extra ' || f d from actual except select 'extra ' || f from expected)
    union all
    (select 'missing ' || f from expected except select 'missing ' || f from actual)
  )
  select string_agg(d, ', ' order by d) into bad from diff;
  if bad is not null then raise exception 'Signed-in callable functions changed: %', bad; end if;

  -- 6. Profile photos: small, and photos only.
  if not exists (
    select 1 from storage.buckets
    where id = 'avatars' and file_size_limit between 1 and 5242880
      and allowed_mime_types is not null
      and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']
  ) then
    raise exception 'The avatars bucket needs a size limit (5 MB max) and photo-only file types.';
  end if;
end $$;
