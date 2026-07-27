begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(24);

select has_table('public', 'grades', 'fixed grade master exists');
select has_table('public', 'members', 'private member/application table exists');
select has_table('public', 'member_directory_profiles', 'safe directory profile exists');
select has_table('public', 'community_identities', 'generic community identity exists');
select has_table('public', 'community_memberships', 'community membership evidence exists');
select has_table('public', 'member_status_history', 'append-only status history exists');
select has_view('app_api', 'member_directory_entries', 'allowlisted directory view exists');
select has_column('public', 'grades', 'code', 'grade has a stable code');
select hasnt_column('public', 'grades', 'year', 'grade is not year-specific');
select col_is_pk('public', 'member_directory_profiles', 'member_id', 'directory profile is one-to-one');
select has_index('public', 'members', 'members_student_id_unique', 'student ID is individually unique');
select has_index('public', 'members', 'members_student_email_unique', 'student email is individually unique');
select has_index('public', 'account', 'account_provider_account_unique', 'provider account is unique');

select is(
  (
    select confdeltype::text
    from pg_constraint
    where conrelid = 'public.members'::regclass
      and conname = 'members_reviewed_by_user_id_fkey'
  ),
  'r'::text,
  'reviewed users cannot be deleted while a membership review references them'
);

select is(
  (
    select confdeltype::text
    from pg_constraint
    where conrelid = 'public.member_status_history'::regclass
      and conname = 'member_status_history_member_id_fkey'
  ),
  'r'::text,
  'members with status history cannot be deleted implicitly'
);

select is(
  (
    select count(*)::integer
    from pg_constraint constraint_record
    join pg_attribute column_record
      on column_record.attrelid = constraint_record.conrelid
     and column_record.attnum = any (constraint_record.conkey)
    where constraint_record.conrelid = 'public.member_status_history'::regclass
      and constraint_record.contype = 'f'
      and column_record.attname = 'changed_by_user_id'
  ),
  0,
  'status-history actor IDs are snapshots without a user foreign key'
);

select is(
  (
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'member_status_history'
      and column_name = 'changed_by_user_id'
  ),
  'NO'::text,
  'every status-history row retains an actor ID snapshot'
);

select results_eq(
  $$select code from public.grades order by sort_order$$,
  $$values
    ('B1'::text), ('B2'::text), ('B3'::text), ('B4'::text),
    ('M1'::text), ('M2'::text),
    ('D1'::text), ('D2'::text), ('D3'::text),
    ('OB_OG'::text), ('OTHER'::text)$$,
  'grade master has exactly the approved classifications'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public."user"'::regclass,
      'public.account'::regclass,
      'public.session'::regclass,
      'public.verification'::regclass,
      'public.grades'::regclass,
      'public.members'::regclass,
      'public.member_directory_profiles'::regclass,
      'public.community_identities'::regclass,
      'public.community_memberships'::regclass,
      'public.member_status_history'::regclass,
      'public.event_messages'::regclass
    ) and relrowsecurity
  ),
  11,
  'every public application table has RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public."user"'::regclass,
      'public.account'::regclass,
      'public.session'::regclass,
      'public.verification'::regclass,
      'public.grades'::regclass,
      'public.members'::regclass,
      'public.member_directory_profiles'::regclass,
      'public.community_identities'::regclass,
      'public.community_memberships'::regclass,
      'public.member_status_history'::regclass,
      'public.event_messages'::regclass
    ) and relforcerowsecurity
  ),
  11,
  'every public application table forces RLS'
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
    from information_schema.columns
    where table_schema = 'app_api'
      and table_name = 'member_directory_entries'
      and column_name in (
        'registered_name',
        'student_id',
        'student_email',
        'emergency_contact',
        'insurance',
        'some_allergy',
        'allergy_details',
        'provider_account_id'
      )
  ),
  0,
  'general directory view contains no private fields'
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

select * from finish();
rollback;
