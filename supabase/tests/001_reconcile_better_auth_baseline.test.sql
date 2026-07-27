begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(16);

select has_table('app_auth', 'user', 'Better Auth user table exists');
select has_table('app_auth', 'account', 'Better Auth account table exists');
select has_table('app_auth', 'session', 'Better Auth session table exists');
select has_table('app_auth', 'verification', 'Better Auth verification table exists');
select has_table('public', 'grades', 'grade table exists');
select has_table('public', 'members', 'member table exists');
select has_table('public', 'event_messages', 'event message table exists');
select has_index('app_auth', 'account', 'account_provider_account_unique', 'provider account is unique');
select has_index('public', 'app_accounts', 'app_accounts_member_id_key', 'a member links to at most one account');
select ok(
  to_regclass('public.members_grade_idx') is not null
  or to_regclass('public.members_grade_id_idx') is not null,
  'member grade foreign key is indexed in the active schema version'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'app_auth."user"'::regclass,
      'app_auth.account'::regclass,
      'app_auth.session'::regclass,
      'app_auth.verification'::regclass,
      'public.grades'::regclass,
      'public.members'::regclass,
      'public.event_messages'::regclass
    ) and relrowsecurity
  ),
  7,
  'all public application tables have RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'app_auth."user"'::regclass,
      'app_auth.account'::regclass,
      'app_auth.session'::regclass,
      'app_auth.verification'::regclass,
      'public.grades'::regclass,
      'public.members'::regclass,
      'public.event_messages'::regclass
    ) and relforcerowsecurity
  ),
  7,
  'all public application tables force RLS'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'service_role')
  ),
  0,
  'Data API roles have no public table privileges'
);

select is(
  (
    select count(*)::integer
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and prosecdef
  ),
  0,
  'public schema has no security-definer functions'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and roles <> array['app_rls']::name[]
  ),
  0,
  'all public RLS policies are scoped only to app_rls'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'users', 'user_role', 'channel_role', 'category_role',
        'channels', 'categories', 'roles'
      )
  ),
  0,
  'empty legacy Supabase Auth tables are removed'
);

select * from finish();
rollback;
