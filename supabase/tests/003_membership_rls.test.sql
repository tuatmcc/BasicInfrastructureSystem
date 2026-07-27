begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, app_api, extensions, pg_catalog;

select plan(19);

-- Test-only grants are rolled back with this file. Runtime migrations do not
-- expose extension functions to the application role.
grant usage on schema extensions to app_rls;
grant execute on all functions in schema extensions to app_rls;

set local role app_rls;

insert into app_auth."user" (
  id, name, email, email_verified, created_at, updated_at
) values
  ('test-admin', 'Admin', 'admin@example.test', true, now(), now()),
  ('test-applicant', 'Applicant', 'applicant@example.test', true, now(), now()),
  ('test-viewer', 'Viewer', 'viewer@example.test', true, now(), now());

insert into public.app_accounts (user_id, role) values
  ('test-admin', 'admin'),
  ('test-applicant', 'user'),
  ('test-viewer', 'user');

select
  set_config('app.current_user_id', 'test-admin', true),
  set_config('app.current_member_id', '', true),
  set_config('app.current_user_role', 'admin', true);

select lives_ok(
  $$
    do $body$
    begin
      insert into public.members (
        member_id,
        registered_name,
        grade_id,
        emergency_contact,
        student_id,
        student_email
      ) values (
        '00000000-0000-4000-8000-000000000002',
        '閲覧者 本人',
        2,
        'test contact',
        'VIEWER001',
        'viewer@student.example'
      );

      update public.members
      set member_status = 'active',
          reviewed_at = now(),
          reviewed_by_user_id = 'test-admin',
          application_version = application_version + 1
      where member_id = '00000000-0000-4000-8000-000000000002';

      update public.app_accounts
      set member_id = '00000000-0000-4000-8000-000000000002'
      where user_id = 'test-viewer';

      insert into public.member_directory_profiles (
        member_id,
        display_name,
        skills,
        interests,
        current_activities,
        bio,
        directory_visible
      ) values (
        '00000000-0000-4000-8000-000000000002',
        'Viewer',
        array['TypeScript'],
        array['Robotics'],
        'Testing',
        'Directory viewer',
        true
      );
    end
    $body$
  $$,
  'admin can create an approved directory member'
);

select
  set_config('app.current_user_id', 'test-applicant', true),
  set_config('app.current_member_id', '00000000-0000-4000-8000-000000000001', true),
  set_config('app.current_user_role', 'user', true);

select throws_ok(
  $$
    insert into public.members (
      member_id,
      registered_name,
      grade_id,
      emergency_contact,
      student_id,
      student_email,
      member_status,
      reviewed_at,
      reviewed_by_user_id
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '不正な承認済み申請',
      1,
      'test contact',
      'INVALID001',
      'invalid@student.example',
      'active',
      now(),
      'test-applicant'
    )
  $$,
  '23514',
  'new membership applications must start pending at version 1 without review metadata',
  'new applications cannot bypass the pending version-1 state'
);

select lives_ok(
  $$
    do $body$
    begin
      insert into public.members (
        member_id,
        registered_name,
        grade_id,
        emergency_contact,
        student_id,
        student_email
      ) values (
        '00000000-0000-4000-8000-000000000001',
        '申請者 本人',
        1,
        'test contact',
        'APPLICANT001',
        'applicant@student.example'
      );

      update public.app_accounts
      set member_id = '00000000-0000-4000-8000-000000000001'
      where user_id = 'test-applicant';
    end
    $body$
  $$,
  'an authenticated user can create exactly their prospective member row'
);

select results_eq(
  $$
    select count(*)
    from public.member_status_history
    where member_id = '00000000-0000-4000-8000-000000000001'
  $$,
  array[1::bigint],
  'pending application creation is recorded in status history'
);

select throws_ok(
  $$
    update public.members
    set application_version = application_version + 2
    where member_id = '00000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'member application version must increase by exactly one',
  'every member update increments the optimistic version exactly once'
);

select throws_ok(
  $$
    update public.members
    set member_status = 'active',
        reviewed_at = now(),
        reviewed_by_user_id = 'test-applicant',
        application_version = application_version + 1
    where member_id = '00000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'only an admin may approve or reject a pending application with consistent review metadata',
  'a regular app_rls actor cannot approve their own pending application'
);

select
  set_config('app.current_user_id', 'test-admin', true),
  set_config('app.current_member_id', '', true),
  set_config('app.current_user_role', 'admin', true);

select throws_ok(
  $$
    insert into public.members (
      member_id, registered_name, grade_id, emergency_contact, student_id, student_email
    ) values (
      '00000000-0000-4000-8000-000000000003',
      '重複 ID',
      1,
      'test contact',
      'APPLICANT001',
      'different@student.example'
    )
  $$,
  '23505',
  null,
  'duplicate normalized student ID is rejected independently'
);

select throws_ok(
  $$
    insert into public.members (
      member_id, registered_name, grade_id, emergency_contact, student_id, student_email
    ) values (
      '00000000-0000-4000-8000-000000000004',
      '重複 Mail',
      1,
      'test contact',
      'DIFFERENT001',
      'applicant@student.example'
    )
  $$,
  '23505',
  null,
  'duplicate normalized student email is rejected independently'
);

select
  set_config('app.current_user_id', 'test-applicant', true),
  set_config('app.current_member_id', '00000000-0000-4000-8000-000000000001', true),
  set_config('app.current_user_role', 'user', true);

select results_eq(
  $$select count(*) from app_api.member_directory_entries$$,
  array[0::bigint],
  'pending applicants cannot read the active-member directory'
);

select
  set_config('app.current_user_id', 'test-admin', true),
  set_config('app.current_member_id', '', true),
  set_config('app.current_user_role', 'admin', true),
  set_config('app.member_status_reason', 'approved in database test', true);

select lives_ok(
  $$
    do $body$
    begin
      update public.members
      set member_status = 'active',
          reviewed_at = now(),
          reviewed_by_user_id = 'test-admin',
          review_reason = null,
          application_version = application_version + 1
      where member_id = '00000000-0000-4000-8000-000000000001';

      insert into public.member_directory_profiles (
        member_id,
        display_name,
        skills,
        interests,
        current_activities,
        bio,
        directory_visible
      ) values (
        '00000000-0000-4000-8000-000000000001',
        'Applicant',
        array['Rust'],
        array['Embedded'],
        'Building a robot',
        'Approved profile',
        true
      );
    end
    $body$
  $$,
  'admin can approve the application and publish its profile atomically'
);

select results_eq(
  $$
    select count(*)
    from public.member_status_history
    where member_id = '00000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'approval adds a second immutable status-history row'
);

select
  set_config('app.current_user_id', 'test-viewer', true),
  set_config('app.current_member_id', '00000000-0000-4000-8000-000000000002', true),
  set_config('app.current_user_role', 'user', true);

select results_eq(
  $$select count(*) from app_api.member_directory_entries$$,
  array[2::bigint],
  'active members can read all visible active directory profiles'
);

select results_eq(
  $$select count(*) from public.members$$,
  array[1::bigint],
  'private member rows remain restricted to self for non-admin users'
);

select throws_ok(
  $$
    update public.member_status_history
    set reason = 'tampered'
    where member_id = '00000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'status history cannot be updated by the application role'
);

select throws_ok(
  $$
    insert into public.member_status_history (
      member_id, from_status, to_status, reason
    ) values (
      '00000000-0000-4000-8000-000000000002',
      'active',
      'rejected',
      'forged'
    )
  $$,
  '42501',
  null,
  'status history cannot be inserted directly by the application role'
);

select
  set_config('app.current_user_id', 'test-admin', true),
  set_config('app.current_member_id', '', true),
  set_config('app.current_user_role', 'admin', true);

-- The reviewer used to be protected by a foreign key. That key crossed into the
-- authentication store and had to go, so the reviewer is now a snapshot:
-- deleting the account succeeds and leaves the review record as written.
select lives_ok(
  $$delete from app_auth."user" where id = 'test-admin'$$,
  'a reviewer account can be deleted because the reviewer is only a snapshot'
);

select is(
  (
    select reviewed_by_user_id
    from public.members
    where member_id = '00000000-0000-4000-8000-000000000002'
  ),
  'test-admin'::text,
  'deleting the reviewer account leaves the review snapshot untouched'
);

select lives_ok(
  $$delete from app_auth."user" where id = 'test-applicant'$$,
  'deleting an authentication account does not rewrite immutable actor snapshots'
);

select results_eq(
  $$
    select changed_by_user_id
    from public.member_status_history
    where member_id = '00000000-0000-4000-8000-000000000001'
      and changed_by_user_id = 'test-applicant'
  $$,
  array['test-applicant'::text],
  'status history retains the deleted applicant actor ID as an audit snapshot'
);

select * from finish();
rollback;
