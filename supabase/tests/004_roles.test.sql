begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select plan(15);

select has_table('public', 'permissions', 'permissions exist as data, not as a list in the source');
select has_table('public', 'roles', 'roles exist as rows');
select has_table('public', 'role_permissions', 'roles carry permissions');
select has_table('public', 'member_roles', 'members hold roles');

-- FR-4.6. The foreign key is the enforcement: someone who has not joined has no
-- member row to point at, so the grant cannot be written at all.
select is(
  (
    select count(*)::integer
    from pg_constraint constraint_record
    join pg_attribute column_record
      on column_record.attrelid = constraint_record.conrelid
     and column_record.attnum = any (constraint_record.conkey)
    where constraint_record.conrelid = 'public.member_roles'::regclass
      and constraint_record.contype = 'f'
      and column_record.attname = 'member_id'
      and constraint_record.confrelid = 'public.members'::regclass
  ),
  1,
  'a role can only be granted to a row in members'
);

-- The grantor is a snapshot for the same reason member_status_history's actor
-- is: the account may be deleted and the record of who granted this must stay.
select is(
  (
    select count(*)::integer
    from pg_constraint constraint_record
    join pg_attribute column_record
      on column_record.attrelid = constraint_record.conrelid
     and column_record.attnum = any (constraint_record.conkey)
    where constraint_record.conrelid = 'public.member_roles'::regclass
      and constraint_record.contype = 'f'
      and column_record.attname = 'granted_by_user_id'
  ),
  0,
  'the grantor is a snapshot without a foreign key into the auth store'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public.permissions'::regclass,
      'public.roles'::regclass,
      'public.role_permissions'::regclass,
      'public.member_roles'::regclass
    ) and relrowsecurity and relforcerowsecurity
  ),
  4,
  'every role table enables and forces RLS'
);

select results_eq(
  $$select permission_key from public.permissions order by permission_key$$,
  $$values
    ('event.manage'::text),
    ('member.edit'::text),
    ('member.read_private'::text),
    ('member.read_public'::text),
    ('member.review'::text),
    ('reaction.read'::text),
    ('role.manage'::text)$$,
  'the seven permissions the requirements derive are present'
);

-- The base role opens the directory and nothing else, so withdrawing it closes
-- the directory too. Everything else has to come from a role that grants it.
select results_eq(
  $$select permission_key from public.role_permissions where role_key = 'member'$$,
  $$values ('member.read_public'::text)$$,
  'the base role carries directory access only'
);

select is(
  (select count(*)::integer from public.role_permissions where role_key = 'admin'),
  7,
  'the admin role carries every permission'
);

select is(
  (select count(*)::integer from public.roles where is_system and role_key in ('member', 'admin')),
  2,
  'the roles the application depends on are marked as such'
);

grant usage on schema extensions to app_rls;
grant execute on all functions in schema extensions to app_rls;
set local role app_rls;

insert into app_auth."user" (id, name, email, email_verified, created_at, updated_at)
values ('roles-admin', 'Admin', 'roles-admin@example.test', true, now(), now()),
       ('roles-member', 'Member', 'roles-member@example.test', true, now(), now());
insert into public.app_accounts (user_id, role)
values ('roles-admin', 'admin'), ('roles-member', 'user');

select
  set_config('app.current_user_id', 'roles-admin', true),
  set_config('app.current_member_id', '', true),
  set_config('app.current_user_role', 'admin', true);

insert into public.members (
  member_id, registered_name, grade_id, emergency_contact, student_id, student_email
) values (
  '00000000-0000-4000-8000-00000000030a', 'Role Holder', 1,
  'contact', 'ROLEHOLDER1', 'roleholder@student.example'
);
update public.app_accounts set member_id = '00000000-0000-4000-8000-00000000030a'
where user_id = 'roles-member';

select lives_ok(
  $$
    insert into public.member_roles (member_id, role_key, granted_by_user_id)
    values ('00000000-0000-4000-8000-00000000030a', 'member', 'roles-admin')
  $$,
  'an admin can grant a role'
);

select
  set_config('app.current_user_id', 'roles-member', true),
  set_config('app.current_member_id', '00000000-0000-4000-8000-00000000030a', true),
  set_config('app.current_user_role', 'user', true);

select throws_ok(
  $$
    insert into public.member_roles (member_id, role_key, granted_by_user_id)
    values ('00000000-0000-4000-8000-00000000030a', 'admin', 'roles-member')
  $$,
  '42501',
  null,
  'a member cannot grant themselves a role'
);

select results_eq(
  $$select role_key from public.member_roles$$,
  $$values ('member'::text)$$,
  'a member sees the roles they hold'
);

select throws_ok(
  $$delete from public.member_roles where role_key = 'member'$$,
  '42501',
  null,
  'a member cannot revoke a role'
);

select * from finish();
rollback;
