import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260716005139_reconcile_better_auth_baseline.sql',
)
const membershipWorkflowMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260716123951_membership_workflow.sql',
)
const confirmedTestDataPurgeRunbookPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/runbooks/purge_confirmed_test_membership_data.sql',
)
const provisionRuntimeLoginRunbookPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/runbooks/provision_app_runtime_login.sql',
)

const createPlatformRolesAndAuthSchema = async (client: PGlite) => {
  await client.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    alter default privileges in schema public grant all on tables to service_role;
    alter default privileges in schema public grant all on sequences to service_role;
    alter default privileges in schema public grant execute on functions to service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid());
  `)
}

const createCurrentSchema = async (client: PGlite, withFixture = true) => {
  await client.exec(`
    create table grades (
      id integer generated always as identity primary key,
      display_grade text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      year bigint not null default extract(year from current_date)
    );

    create table members (
      name text not null,
      grade integer not null references grades(id) on delete set null,
      emergency_contact text not null,
      student_id text not null,
      student_email text not null,
      insurance boolean not null default false,
      some_allergy boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      member_id uuid primary key default gen_random_uuid()
    );

    create table "user" (
      id text primary key,
      name text not null,
      email text not null unique,
      email_verified boolean not null,
      image text,
      created_at timestamp not null,
      updated_at timestamp not null,
      discord_user_id text,
      display_name text,
      member_id uuid references members(member_id) on delete set null,
      role text not null default 'user'
    );

    create table account (
      id text primary key,
      account_id text not null,
      provider_id text not null,
      user_id text not null references "user"(id) on delete cascade,
      access_token text,
      refresh_token text,
      id_token text,
      access_token_expires_at timestamp,
      refresh_token_expires_at timestamp,
      scope text,
      password text,
      created_at timestamp not null,
      updated_at timestamp not null
    );

    create table session (
      id text primary key,
      expires_at timestamp not null,
      token text not null unique,
      created_at timestamp not null,
      updated_at timestamp not null,
      ip_address text,
      user_agent text,
      user_id text not null references "user"(id) on delete cascade
    );

    create table verification (
      id text primary key,
      identifier text not null,
      value text not null,
      expires_at timestamp not null,
      created_at timestamp,
      updated_at timestamp
    );

    create table event_messages (
      id uuid primary key default gen_random_uuid(),
      channel_id text not null,
      message_id text not null unique,
      content text not null,
      created_by text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    as $$ begin return new; end $$;

    ${withFixture ? `
      insert into grades (id, display_grade)
        overriding system value values (1, 'M1');

      insert into members (
        member_id, name, grade, emergency_contact, student_id, student_email
      ) values
        ('00000000-0000-4000-8000-000000000001', 'One', 1, 'contact', 'A001', 'one@example.test'),
        ('00000000-0000-4000-8000-000000000002', 'Two', 1, 'contact', 'A002', 'two@example.test'),
        ('00000000-0000-4000-8000-000000000003', 'Three', 1, 'contact', 'A003', 'three@example.test');

      insert into "user" (
        id, name, email, email_verified, created_at, updated_at, member_id, role
      ) values
        ('user-1', 'One', 'one@example.test', true, now(), now(), '00000000-0000-4000-8000-000000000001', 'admin'),
        ('user-2', 'Two', 'two@example.test', true, now(), now(), '00000000-0000-4000-8000-000000000002', 'user');

      insert into account (
        id, account_id, provider_id, user_id, created_at, updated_at
      ) values
        ('account-1', 'github-1', 'github', 'user-1', now(), now()),
        ('account-2', 'github-2', 'github', 'user-2', now(), now());

      insert into event_messages (channel_id, message_id, content, created_by)
      values ('channel-1', 'message-1', 'event', 'user-1');
    ` : ''}
  `)
}

const renderConfirmedFixturePurge = (source: string) => {
  const replacements: Record<string, string> = {
    REPLACE_WITH_PIPE_SEPARATED_VERIFICATION_IDS_OR_EMPTY: 'EMPTY',
    REPLACE_WITH_PIPE_SEPARATED_SESSION_IDS_OR_EMPTY: 'EMPTY',
    REPLACE_WITH_PIPE_SEPARATED_ACCOUNT_IDS_OR_EMPTY: 'account-1|account-2',
    REPLACE_WITH_PIPE_SEPARATED_USER_IDS_OR_EMPTY: 'user-1|user-2',
    REPLACE_WITH_PIPE_SEPARATED_MEMBER_IDS_OR_EMPTY:
      '00000000-0000-4000-8000-000000000001|00000000-0000-4000-8000-000000000002|00000000-0000-4000-8000-000000000003',
    REPLACE_WITH_PIPE_SEPARATED_GRADE_IDS_OR_EMPTY: '1',
    'REPLACE_WITH_PIPE_SEPARATED_ACCOUNT_ID=>USER_ID_LINKS_OR_EMPTY':
      'account-1=>user-1|account-2=>user-2',
    'REPLACE_WITH_PIPE_SEPARATED_SESSION_ID=>USER_ID_LINKS_OR_EMPTY': 'EMPTY',
    'REPLACE_WITH_PIPE_SEPARATED_USER_ID=>MEMBER_ID_LINKS_OR_EMPTY':
      'user-1=>00000000-0000-4000-8000-000000000001|user-2=>00000000-0000-4000-8000-000000000002',
    'REPLACE_WITH_PIPE_SEPARATED_MEMBER_ID=>GRADE_ID_LINKS_OR_EMPTY':
      '00000000-0000-4000-8000-000000000001=>1|00000000-0000-4000-8000-000000000002=>1|00000000-0000-4000-8000-000000000003=>1',
  }

  return Object.entries(replacements).reduce(
    (rendered, [placeholder, value]) => rendered.replaceAll(placeholder, value),
    source,
  )
}

test('reconciliation preserves the running Better Auth data and hardens RLS', async () => {
  const client = await PGlite.create()

  try {
    await createPlatformRolesAndAuthSchema(client)
    await createCurrentSchema(client)
    await client.exec(await readFile(migrationPath, 'utf8'))

    const counts = await client.query<{
      accounts: number
      events: number
      grades: number
      members: number
      users: number
    }>(`
      select
        (select count(*)::int from account) as accounts,
        (select count(*)::int from event_messages) as events,
        (select count(*)::int from grades) as grades,
        (select count(*)::int from members) as members,
        (select count(*)::int from "user") as users
    `)
    assert.deepEqual(counts.rows[0], {
      accounts: 2,
      events: 1,
      grades: 1,
      members: 3,
      users: 2,
    })

    const legacyFunction = await client.query<{ exists: boolean }>(`
      select to_regprocedure('public.handle_new_user()') is not null as exists
    `)
    assert.equal(legacyFunction.rows[0].exists, false)

    await assert.rejects(
      client.query(`
        insert into account (
          id, account_id, provider_id, user_id, created_at, updated_at
        ) values ('duplicate', 'github-1', 'github', 'user-2', now(), now())
      `),
      /account_provider_account_unique/,
    )

    await client.exec(`
      set role app_rls;
      select set_config('app.current_user_id', 'user-2', false);
      select set_config('app.current_member_id', '00000000-0000-4000-8000-000000000002', false);
      select set_config('app.current_user_role', 'user', false);
    `)
    const visibleMembers = await client.query<{ count: number }>(
      'select count(*)::int as count from members',
    )
    assert.equal(visibleMembers.rows[0].count, 1)
  } finally {
    await client.close()
  }
})

test('reconciliation converges an empty legacy replay to Better Auth tables', async () => {
  const client = await PGlite.create()

  try {
    await createPlatformRolesAndAuthSchema(client)
    await client.exec(`
      create table grades (
        id integer primary key,
        display_grade text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table members (
        name text not null,
        grade integer not null references grades(id) on delete set null,
        emergency_contact text not null,
        student_id text not null,
        student_email text not null,
        insurance boolean not null default false,
        some_allergy boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        member_id uuid primary key default gen_random_uuid()
      );
      create table users (
        discord_user_id text primary key,
        display_name text not null,
        member_id uuid references members(member_id) on delete set null
      );
    `)

    await client.exec(await readFile(migrationPath, 'utf8'))

    const reconciled = await client.query<{
      account_exists: boolean
      event_exists: boolean
      legacy_users_removed: boolean
      user_exists: boolean
      year_exists: boolean
    }>(`
      select
        to_regclass('public.account') is not null as account_exists,
        to_regclass('public.event_messages') is not null as event_exists,
        to_regclass('public.users') is null as legacy_users_removed,
        to_regclass('public."user"') is not null as user_exists,
        exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'grades' and column_name = 'year'
        ) as year_exists
    `)
    assert.deepEqual(reconciled.rows[0], {
      account_exists: true,
      event_exists: true,
      legacy_users_removed: true,
      user_exists: true,
      year_exists: true,
    })
  } finally {
    await client.close()
  }
})

test('membership workflow requires the audited purge, retains events, and hardens runtime privileges', async () => {
  const client = await PGlite.create()

  try {
    await createPlatformRolesAndAuthSchema(client)
    await createCurrentSchema(client)
    await client.exec(await readFile(migrationPath, 'utf8'))
    const workflowMigration = await readFile(membershipWorkflowMigrationPath, 'utf8')
    await assert.rejects(
      client.exec(workflowMigration),
      /membership workflow requires empty replaced tables/,
    )
    // The migration opens its own transaction, so the refusal leaves it aborted
    // until it is ended explicitly.
    await client.exec('rollback')

    const purgeRunbook = renderConfirmedFixturePurge(
      await readFile(confirmedTestDataPurgeRunbookPath, 'utf8'),
    )
    await assert.rejects(
      client.exec(purgeRunbook.replace('account-2=>user-2', 'account-2=>user-1')),
      /account->user audit failed/,
    )
    await client.exec('rollback')
    await client.exec(purgeRunbook)
    await client.exec(workflowMigration)

    const result = await client.query<{
      accounts: number
      communities: number
      events: number
      grades: number
      members: number
      profiles: number
      users: number
    }>(`
      select
        (select count(*)::int from account) as accounts,
        (select count(*)::int from community_identities) as communities,
        (select count(*)::int from event_messages) as events,
        (select count(*)::int from grades) as grades,
        (select count(*)::int from members) as members,
        (select count(*)::int from member_directory_profiles) as profiles,
        (select count(*)::int from "user") as users
    `)
    assert.deepEqual(result.rows[0], {
      accounts: 0,
      communities: 0,
      events: 1,
      grades: 11,
      members: 0,
      profiles: 0,
      users: 0,
    })

    const gradeCodes = await client.query<{ code: string }>(
      'select code from grades order by sort_order',
    )
    assert.deepEqual(
      gradeCodes.rows.map(({ code }) => code),
      ['B1', 'B2', 'B3', 'B4', 'M1', 'M2', 'D1', 'D2', 'D3', 'OB_OG', 'OTHER'],
    )

    const schema = await client.query<{
      directory_view_exists: boolean
      legacy_discord_id_exists: boolean
      status_history_exists: boolean
    }>(`
      select
        to_regclass('app_api.member_directory_entries') is not null as directory_view_exists,
        exists (
          select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'user'
            and column_name = 'discord_user_id'
        ) as legacy_discord_id_exists,
        to_regclass('public.member_status_history') is not null as status_history_exists
    `)
    assert.deepEqual(schema.rows[0], {
      directory_view_exists: true,
      legacy_discord_id_exists: false,
      status_history_exists: true,
    })

    const serviceRoleGrants = await client.query<{ count: number }>(`
      select count(*)::int as count
      from information_schema.role_table_grants
      where grantee = 'service_role'
        and table_schema in ('public', 'app_private', 'app_api')
    `)
    assert.equal(serviceRoleGrants.rows[0].count, 0)

    await client.exec('create table public.service_role_default_privilege_probe (id integer primary key)')
    const serviceRoleDefaultGrant = await client.query<{ allowed: boolean }>(`
      select has_table_privilege(
        'service_role',
        'public.service_role_default_privilege_probe',
        'select'
      ) as allowed
    `)
    assert.equal(serviceRoleDefaultGrant.rows[0].allowed, false)
    await client.exec('drop table public.service_role_default_privilege_probe')

    await client.exec(`
      set role app_rls;
      insert into "user" (
        id, name, email, email_verified, created_at, updated_at, role
      ) values
        (
          'workflow-admin', 'Workflow Admin', 'workflow-admin@example.test',
          true, now(), now(), 'admin'
        ),
        (
          'workflow-user', 'Workflow User', 'workflow-user@example.test',
          true, now(), now(), 'user'
        );
      select set_config('app.current_user_id', 'workflow-admin', false);
      select set_config('app.current_member_id', '', false);
      select set_config('app.current_user_role', 'admin', false);
      insert into members (
        member_id, registered_name, grade_id, emergency_contact,
        student_id, student_email
      ) values (
        '00000000-0000-4000-8000-000000000099', 'Workflow Applicant', 1,
        'contact', 'WORKFLOW099', 'workflow099@example.test'
      );

      select set_config('app.current_user_id', 'workflow-user', false);
      select set_config(
        'app.current_member_id',
        '00000000-0000-4000-8000-000000000100',
        false
      );
      select set_config('app.current_user_role', 'user', false);
      insert into members (
        member_id, registered_name, grade_id, emergency_contact,
        student_id, student_email
      ) values (
        '00000000-0000-4000-8000-000000000100', 'Workflow User', 1,
        'contact', 'WORKFLOW100', 'workflow100@example.test'
      );
    `)
    const history = await client.query<{ count: number }>(`
      select count(*)::int as count
      from member_status_history
      where member_id = '00000000-0000-4000-8000-000000000100'
    `)
    assert.equal(history.rows[0].count, 1)
    await assert.rejects(
      client.exec(`
        update members
        set application_version = application_version + 2
        where member_id = '00000000-0000-4000-8000-000000000100'
      `),
      /member application version must increase by exactly one/,
    )
    await assert.rejects(
      client.exec(`
        update members
        set member_status = 'active',
            reviewed_at = now(),
            reviewed_by_user_id = 'workflow-user',
            application_version = application_version + 1
        where member_id = '00000000-0000-4000-8000-000000000100'
      `),
      /only an admin may approve or reject a pending application/,
    )
    await assert.rejects(
      client.exec(`
        insert into member_status_history (
          member_id, from_status, to_status, reason
        ) values (
          '00000000-0000-4000-8000-000000000100',
          'pending', 'active', 'forged'
        )
      `),
      /permission denied/i,
    )

    await client.exec(`
      select set_config('app.current_user_id', 'workflow-admin', false);
      select set_config('app.current_member_id', '', false);
      select set_config('app.current_user_role', 'admin', false);
      update members
      set member_status = 'active',
          reviewed_at = now(),
          reviewed_by_user_id = 'workflow-admin',
          application_version = application_version + 1
      where member_id = '00000000-0000-4000-8000-000000000100';
    `)
    await assert.rejects(
      client.exec(`delete from "user" where id = 'workflow-admin'`),
      /foreign key constraint|violates foreign key/i,
    )
    await client.exec(`delete from "user" where id = 'workflow-user'`)
    const actorSnapshots = await client.query<{ changed_by_user_id: string }>(`
      select changed_by_user_id
      from member_status_history
      where member_id = '00000000-0000-4000-8000-000000000100'
      order by history_id
    `)
    assert.deepEqual(
      actorSnapshots.rows.map(({ changed_by_user_id }) => changed_by_user_id),
      ['workflow-user', 'workflow-admin'],
    )

    await client.exec('reset role; reset all')
    const runtimeLoginRunbook = (
      await readFile(provisionRuntimeLoginRunbookPath, 'utf8')
    )
      .replaceAll('REPLACE_WITH_APP_RUNTIME_LOGIN_ROLE', 'workflow_runtime_login')
      .replaceAll(
        'REPLACE_WITH_STRONG_RANDOM_PASSWORD',
        'pglite-test-password-32-characters-minimum',
      )
    await client.exec(runtimeLoginRunbook)
    const runtimeRole = await client.query<{
      can_use_inherited_privileges: boolean
      can_login: boolean
      inherits: boolean
      is_member: boolean
      bypasses_rls: boolean
      owns_database: boolean
    }>(`
      select
        rolcanlogin as can_login,
        rolinherit as inherits,
        rolbypassrls as bypasses_rls,
        pg_has_role('workflow_runtime_login', 'app_rls', 'MEMBER') as is_member,
        pg_has_role('workflow_runtime_login', 'app_rls', 'USAGE')
          as can_use_inherited_privileges,
        exists (
          select 1
          from pg_database
          where datdba = pg_roles.oid
        ) as owns_database
      from pg_roles
      where rolname = 'workflow_runtime_login'
    `)
    assert.deepEqual(runtimeRole.rows[0], {
      can_use_inherited_privileges: true,
      can_login: true,
      inherits: true,
      is_member: true,
      bypasses_rls: false,
      owns_database: false,
    })

    const runtimeDirectGrants = await client.query<{ count: number }>(`
      select count(*)::int as count
      from information_schema.role_table_grants
      where grantee = 'workflow_runtime_login'
        and table_schema in ('public', 'app_private', 'app_api')
    `)
    assert.equal(runtimeDirectGrants.rows[0].count, 0)

    await client.exec('reset all; set role workflow_runtime_login')
    const inheritedAccess = await client.query<{
      auth_users: number
      business_members: number
    }>(`
      select
        (select count(*)::int from "user") as auth_users,
        (select count(*)::int from members) as business_members
    `)
    assert.deepEqual(inheritedAccess.rows[0], {
      auth_users: 1,
      business_members: 0,
    })
    await client.exec('reset role; reset all')
  } finally {
    await client.close()
  }
})

test('membership workflow fresh replay does not require Supabase API roles', async () => {
  const client = await PGlite.create()

  try {
    await createCurrentSchema(client, false)
    await client.exec(await readFile(membershipWorkflowMigrationPath, 'utf8'))

    const replay = await client.query<{
      grades: number
      members: number
      workflow_guard_exists: boolean
    }>(`
      select
        (select count(*)::int from grades) as grades,
        (select count(*)::int from members) as members,
        to_regprocedure('app_private.enforce_member_workflow()') is not null
          as workflow_guard_exists
    `)
    assert.deepEqual(replay.rows[0], {
      grades: 11,
      members: 0,
      workflow_guard_exists: true,
    })
  } finally {
    await client.close()
  }
})
