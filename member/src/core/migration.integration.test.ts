import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { CHECKED_PERMISSIONS } from '../../../share/permissions'
import { findPermissions } from './permissions'

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260716005139_reconcile_better_auth_baseline.sql',
)
const membershipWorkflowMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260716123951_membership_workflow.sql',
)
const splitAuthSchemaMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260727000000_split_auth_schema.sql',
)
const roleTablesMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20260904000000_add_role_tables.sql',
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

test('splitting the auth schema leaves no reference from the domain into app_auth', async () => {
  const client = await PGlite.create()

  try {
    await createCurrentSchema(client, false)
    await client.exec(await readFile(membershipWorkflowMigrationPath, 'utf8'))
    await client.exec(await readFile(splitAuthSchemaMigrationPath, 'utf8'))

    const layout = await client.query<{
      auth_tables: number
      public_auth_tables: number
      accounts_exists: boolean
      user_has_domain_columns: number
    }>(`
      select
        (select count(*)::int from pg_tables
          where schemaname = 'app_auth'
            and tablename in ('user', 'session', 'account', 'verification')) as auth_tables,
        (select count(*)::int from pg_tables
          where schemaname = 'public'
            and tablename in ('user', 'session', 'account', 'verification')) as public_auth_tables,
        to_regclass('public.app_accounts') is not null as accounts_exists,
        (select count(*)::int from information_schema.columns
          where table_schema = 'app_auth'
            and table_name = 'user'
            and column_name in ('member_id', 'role')) as user_has_domain_columns
    `)
    assert.deepEqual(layout.rows[0], {
      auth_tables: 4,
      public_auth_tables: 0,
      accounts_exists: true,
      user_has_domain_columns: 0,
    })

    // A foreign key cannot span databases. If one is ever added across this
    // boundary, moving the authentication store becomes a schema migration
    // again, so the absence is asserted rather than left to review.
    const crossings = await client.query<{ constraint_name: string }>(`
      select con.conname as constraint_name
      from pg_constraint con
      join pg_class child on child.oid = con.conrelid
      join pg_namespace child_ns on child_ns.oid = child.relnamespace
      join pg_class parent on parent.oid = con.confrelid
      join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
      where con.contype = 'f'
        and (
          (child_ns.nspname = 'public' and parent_ns.nspname = 'app_auth')
          or (child_ns.nspname = 'app_auth' and parent_ns.nspname = 'public')
        )
    `)
    assert.deepEqual(crossings.rows, [])
  } finally {
    await client.close()
  }
})

// U-1 (docs/aidlc/unit-of-work.md): roles move off the login account and onto
// the member. The migration only adds, so what matters is that it carries the
// existing state across unchanged and that the new tables refuse a grant the
// requirements say must be impossible.
const replayThroughSplit = async (client: PGlite) => {
  await createCurrentSchema(client, false)
  await client.exec(await readFile(membershipWorkflowMigrationPath, 'utf8'))
  await client.exec(await readFile(splitAuthSchemaMigrationPath, 'utf8'))
}

// Seeding has to follow the real path: the trigger cross-checks the role the
// caller claims against app_accounts, so an actor cannot simply assert it is an
// admin. The first admin is bootstrapped the way production was — apply, then
// promote the column directly — because approving requires an admin to exist.
const applyAsNewUser = async (
  client: PGlite,
  { userId, memberId }: { userId: string; memberId: string },
) => {
  await client.exec(`
    insert into app_auth."user" (id, name, email, email_verified, created_at, updated_at)
    values ('${userId}', '${userId}', '${userId}@example.test', true, now(), now());
    insert into public.app_accounts (user_id, role) values ('${userId}', 'user');

    select set_config('app.current_user_id', '${userId}', false);
    select set_config('app.current_member_id', '${memberId}', false);
    select set_config('app.current_user_role', 'user', false);
    insert into public.members (
      member_id, registered_name, grade_id, emergency_contact, student_id, student_email
    ) values (
      '${memberId}', '${userId}', 1, 'contact', upper('${userId}'), '${userId}@student.example'
    );

    update public.app_accounts set member_id = '${memberId}' where user_id = '${userId}';
  `)
}

const promoteToAdmin = (client: PGlite, userId: string) =>
  client.exec(`update public.app_accounts set role = 'admin' where user_id = '${userId}'`)

const approveMember = (client: PGlite, adminUserId: string, memberId: string) =>
  client.exec(`
    select set_config('app.current_user_id', '${adminUserId}', false);
    select set_config('app.current_member_id', '', false);
    select set_config('app.current_user_role', 'admin', false);
    update public.members
    set member_status = 'active',
        reviewed_at = now(),
        reviewed_by_user_id = '${adminUserId}',
        application_version = application_version + 1
    where member_id = '${memberId}';
  `)

test('the role tables carry the existing admin column across unchanged', async () => {
  const client = await PGlite.create()

  try {
    await replayThroughSplit(client)
    const adminMemberId = '00000000-0000-4000-8000-000000000201'
    const plainMemberId = '00000000-0000-4000-8000-000000000202'

    await applyAsNewUser(client, { userId: 'role-admin', memberId: adminMemberId })
    await promoteToAdmin(client, 'role-admin')
    await approveMember(client, 'role-admin', adminMemberId)

    await applyAsNewUser(client, { userId: 'role-member', memberId: plainMemberId })
    await approveMember(client, 'role-admin', plainMemberId)

    await client.exec(await readFile(roleTablesMigrationPath, 'utf8'))

    // Everyone active holds the base role; only the old column's admin also
    // holds admin. Until U-4 removes that column the two must agree.
    const grants = await client.query<{ member_id: string; role_key: string }>(`
      select member_id::text, role_key
      from public.member_roles
      order by member_id, role_key
    `)
    assert.deepEqual(grants.rows, [
      { member_id: '00000000-0000-4000-8000-000000000201', role_key: 'admin' },
      { member_id: '00000000-0000-4000-8000-000000000201', role_key: 'member' },
      { member_id: '00000000-0000-4000-8000-000000000202', role_key: 'member' },
    ])

    // The base role opens the directory and nothing else. Everything an
    // administrator can do has to be reachable from the admin role instead.
    const carried = await client.query<{ role_key: string; permissions: number }>(`
      select role_key, count(*)::int as permissions
      from public.role_permissions
      group by role_key
      order by role_key
    `)
    assert.deepEqual(carried.rows, [
      { role_key: 'admin', permissions: 7 },
      { role_key: 'member', permissions: 1 },
    ])
  } finally {
    await client.close()
  }
})

test('a role cannot be granted to someone who is not a member', async () => {
  const client = await PGlite.create()

  try {
    await replayThroughSplit(client)
    await client.exec(await readFile(roleTablesMigrationPath, 'utf8'))

    // FR-4.6. There is no member row to point at, so the grant has nowhere to
    // land — the constraint refuses it rather than the application remembering
    // to check.
    await assert.rejects(
      client.exec(`
        insert into public.member_roles (member_id, role_key, granted_by_user_id)
        values ('00000000-0000-4000-8000-000000000999', 'admin', 'someone')
      `),
      /foreign key/i,
    )
  } finally {
    await client.close()
  }
})

test('the role migration refuses to run when an admin has no member row', async () => {
  const client = await PGlite.create()

  try {
    await replayThroughSplit(client)
    await client.exec(`
      insert into app_auth."user" (id, name, email, email_verified, created_at, updated_at)
      values ('stray-admin', 'Stray', 'stray@example.test', true, now(), now());
      insert into public.app_accounts (user_id, member_id, role)
      values ('stray-admin', null, 'admin');
    `)

    // docs/aidlc/intent.md 6.4 settles that an administrator is always a member.
    // Such an account cannot hold a role, and quietly dropping its privileges
    // mid-migration would be a worse outcome than refusing to migrate.
    await assert.rejects(
      client.exec(await readFile(roleTablesMigrationPath, 'utf8')),
      /have no member row/,
    )
  } finally {
    await client.close()
  }
})

// U-2 (docs/aidlc/unit-of-work.md). Permissions live in the database, so a
// permission name in the source is just a string: misspell it and the check
// silently asks for something nobody holds. This is the check that makes the
// mismatch fail here instead of in production.
test('every permission the code checks exists in the database', async () => {
  const client = await PGlite.create()

  try {
    await replayThroughSplit(client)
    await client.exec(await readFile(roleTablesMigrationPath, 'utf8'))

    const stored = await client.query<{ permission_key: string }>(
      'select permission_key from public.permissions',
    )
    const storedKeys = new Set(stored.rows.map((row) => row.permission_key))

    const missing = CHECKED_PERMISSIONS.filter((key) => !storedKeys.has(key))
    assert.deepEqual(
      missing,
      [],
      'these permission names appear in the code but not in the database',
    )
  } finally {
    await client.close()
  }
})

// U-3 exercises the real migration under app_rls, independently of API stubs.
test('database permissions replace role claims and keep independent grants independent', async () => {
  const client = await PGlite.create()
  const adminId = '00000000-0000-4000-8000-000000000401'
  const memberId = '00000000-0000-4000-8000-000000000402'
  try {
    await replayThroughSplit(client)
    await applyAsNewUser(client, { userId: 'permission-admin', memberId: adminId })
    await promoteToAdmin(client, 'permission-admin')
    await approveMember(client, 'permission-admin', adminId)
    await applyAsNewUser(client, { userId: 'permission-member', memberId })
    await client.exec(await readFile(roleTablesMigrationPath, 'utf8'))
    await client.exec(await readFile(resolve(dirname(roleTablesMigrationPath), '20261105072955_enforce_permissions.sql'), 'utf8'))
    const obsolete = await client.query(`select column_name from information_schema.columns where table_name = 'app_accounts' and column_name = 'role'`)
    assert.equal(obsolete.rows.length, 0)
    const policies = await client.query<{ qual: string; with_check: string }>(`select qual, with_check from pg_policies where schemaname in ('public', 'app_auth')`)
    assert.doesNotMatch(JSON.stringify(policies.rows), /current_user_role|current_member_id',/)
    await client.exec(`
      insert into public.app_roles(role_key, display_name) values ('reviewer', 'Reviewer'), ('events', 'Events');
      insert into public.role_permissions values ('reviewer', 'member.review', now()), ('reviewer', 'member.read_private', now()), ('events', 'event.manage', now());
      set role app_rls;
      select set_config('app.current_user_id', 'permission-member', false),
             set_config('app.current_user_role', 'admin', false),
             set_config('app.current_member_id', '${adminId}', false);
    `)
    const own = await client.query<{ member_id: string }>('select member_id from public.members')
    assert.deepEqual(own.rows, [{ member_id: memberId }])
    await assert.rejects(client.exec(`insert into public.member_roles values ('${memberId}', 'admin', 'permission-member', now())`), /row-level security/)
    await assert.rejects(client.exec(`insert into public.grades(code, display_grade, sort_order) values ('FAKE', 'Fake', 999)`), /permission denied/)
    await client.exec(`delete from public.member_roles where member_id = '${adminId}'`)
    await client.exec(`reset role;`)
    const survived = await client.query<{ n: number }>(`select count(*)::int as n from member_roles where member_id = '${adminId}' and role_key = 'admin'`)
    assert.equal(survived.rows[0].n, 1)
    await client.exec(`insert into member_roles values ('${memberId}', 'events', 'test', now()); set role app_rls;`)
    const limited = await client.query<{ permissions: string[] }>(`select app_private.permissions_for('permission-member') as permissions`)
    assert.deepEqual(limited.rows[0].permissions, ['event.manage'])
    assert.equal((await client.query(`select * from public.members`)).rows.length, 1)
    await client.exec(`reset role; insert into member_roles values ('${memberId}', 'reviewer', 'test', now()); set role app_rls;`)
    await assert.rejects(client.exec(`update members set registered_name = 'forged', application_version = application_version + 1 where member_id = '${adminId}'`), /member.edit is required/)
    await client.exec(`select set_config('app.current_user_id', 'permission-admin', false), set_config('app.current_user_role', '', false)`)
    await client.exec(`update members set member_status = 'active', reviewed_at = now(), reviewed_by_user_id = 'permission-admin', application_version = application_version + 1 where member_id = '${memberId}'`)
    const approved = await client.query<{ allowed: boolean }>(`select app_private.has_permission('permission-member', 'member.read_public') as allowed`)
    assert.equal(approved.rows[0].allowed, true)
    await client.exec(`delete from member_roles where member_id = '${memberId}' and role_key = 'events'`)
    const revoked = await client.query<{ allowed: boolean }>(`select app_private.has_permission('permission-member', 'event.manage') as allowed`)
    assert.equal(revoked.rows[0].allowed, false)
  } finally { await client.close() }
})

// API（findPermissions）と RLS（app_private.permissions_for）は、同じたどり方で権限を求める。
// 片方だけ変えると答えが食い違うので、立場の違う 3 人について一致を確かめる。
// 認証処理は呼び出し元が決まる前に権限を読むので、app.current_user_id が空の状態で読む。
test('API と RLS は同じ権限を求める', async () => {
  const client = await PGlite.create()
  const adminId = '00000000-0000-4000-8000-000000000501'
  const memberId = '00000000-0000-4000-8000-000000000502'
  try {
    await replayThroughSplit(client)
    await applyAsNewUser(client, { userId: 'same-admin', memberId: adminId })
    await promoteToAdmin(client, 'same-admin')
    await approveMember(client, 'same-admin', adminId)
    await applyAsNewUser(client, { userId: 'same-member', memberId })
    await client.exec(await readFile(roleTablesMigrationPath, 'utf8'))
    await client.exec(await readFile(resolve(dirname(roleTablesMigrationPath), '20261105072955_enforce_permissions.sql'), 'utf8'))

    // same-member には、同じ権限（member.review）を含む 2 つのロールを付ける。
    // same-outsider はログインしただけで、部員の行がない。
    await client.exec(`
      insert into app_auth."user" (id, name, email, email_verified, created_at, updated_at)
      values ('same-outsider', 'same-outsider', 'same-outsider@example.test', true, now(), now());
      insert into public.app_accounts (user_id) values ('same-outsider');
      insert into public.app_roles (role_key, display_name) values ('reviewer', 'Reviewer'), ('lead', 'Lead');
      insert into public.role_permissions values
        ('reviewer', 'member.review', now()), ('reviewer', 'member.read_private', now()),
        ('lead', 'member.review', now()), ('lead', 'event.manage', now());
      insert into public.member_roles values
        ('${memberId}', 'reviewer', 'test', now()), ('${memberId}', 'lead', 'test', now());
      select set_config('app.current_user_id', '', false);
      set role app_rls;
    `)

    const db = drizzle(client)
    const expected: Record<string, string[]> = {
      'same-admin': [...CHECKED_PERMISSIONS].sort(),
      'same-member': ['event.manage', 'member.read_private', 'member.review'],
      'same-outsider': [],
    }
    for (const [userId, permissions] of Object.entries(expected)) {
      const fromApi = (await findPermissions(db as never, userId)).sort()
      const fromRls = await client.query<{ permissions: string[] }>(
        'select app_private.permissions_for($1) as permissions',
        [userId],
      )
      assert.deepEqual(fromApi, [...fromRls.rows[0].permissions].sort(), `${userId}: API と RLS で答えが違う`)
      assert.deepEqual(fromApi, permissions, `${userId}: 権限が想定と違う`)
    }
  } finally {
    await client.close()
  }
})

// RLS の 2 つの原則（docs/aidlc/components.md 3.6）を確かめる。
//   原則 1：RLS は API より緩い。部員を管理する権限のどれか 1 つだけでも、部員の行がすべて読める。
//   原則 2：RLS が止めるのは、他人の個人情報の流出と、権限の拡大だけ。
test('RLS は API より緩く、個人情報の流出と権限の拡大だけを止める', async () => {
  const client = await PGlite.create()
  const id = (n: number) => `00000000-0000-4000-8000-000000000${n}`
  try {
    await replayThroughSplit(client)
    await applyAsNewUser(client, { userId: 'rls-admin', memberId: id(601) })
    await promoteToAdmin(client, 'rls-admin')
    await approveMember(client, 'rls-admin', id(601))
    await applyAsNewUser(client, { userId: 'rls-reader', memberId: id(602) })
    await applyAsNewUser(client, { userId: 'rls-reviewer', memberId: id(603) })
    await applyAsNewUser(client, { userId: 'rls-editor', memberId: id(604) })
    await applyAsNewUser(client, { userId: 'rls-plain', memberId: id(605) })
    await client.exec(await readFile(roleTablesMigrationPath, 'utf8'))
    await client.exec(await readFile(resolve(dirname(roleTablesMigrationPath), '20261105072955_enforce_permissions.sql'), 'utf8'))

    // 部員を管理する権限を 1 つずつ持つロールを作る。
    // 606 はロールを持つが誰とも結び付いていない部員、607 はロールのない部員。
    await client.exec(`
      insert into public.app_roles (role_key, display_name) values
        ('reader', 'Reader'), ('reviewer', 'Reviewer'), ('editor', 'Editor'), ('events', 'Events');
      insert into public.role_permissions values
        ('reader', 'member.read_private', now()), ('reviewer', 'member.review', now()),
        ('editor', 'member.edit', now()), ('events', 'event.manage', now());
      insert into public.member_roles values
        ('${id(602)}', 'reader', 'test', now()), ('${id(603)}', 'reviewer', 'test', now()),
        ('${id(604)}', 'editor', 'test', now());
      insert into app_auth."user" (id, name, email, email_verified, created_at, updated_at)
      values ('rls-outsider', 'rls-outsider', 'rls-outsider@example.test', true, now(), now());
      insert into public.app_accounts (user_id) values ('rls-outsider');
      select set_config('app.current_user_id', 'rls-admin', false);
      insert into public.members (member_id, registered_name, grade_id, emergency_contact, student_id, student_email)
      values ('${id(606)}', 'with role', 1, 'contact', 'WITHROLE', 'with-role@student.example'),
             ('${id(607)}', 'fresh', 1, 'contact', 'FRESH', 'fresh@student.example');
      insert into public.member_roles values ('${id(606)}', 'events', 'test', now());
    `)
    const total = (await client.query<{ n: number }>('select count(*)::int as n from public.members')).rows[0].n

    await client.exec('set role app_rls')
    const visibleTo = async (userId: string) => {
      await client.query(`select set_config('app.current_user_id', $1, false)`, [userId])
      return (await client.query<{ n: number }>('select count(*)::int as n from public.members')).rows[0].n
    }

    // 原則 1：管理する権限のどれか 1 つで、すべての部員が見える（黙って 0 件にならない）
    assert.equal(await visibleTo('rls-reader'), total, 'member.read_private だけで全員が見える')
    assert.equal(await visibleTo('rls-reviewer'), total, 'member.review だけで全員が見える')
    assert.equal(await visibleTo('rls-editor'), total, 'member.edit だけで全員が見える')

    // 原則 1：守らない表は、アプリの接続ユーザーにすべて許している
    const openPolicies = await client.query<{ tablename: string; qual: string; with_check: string }>(`
      select tablename, qual, with_check from pg_policies
      where tablename in ('event_messages', 'community_identities', 'community_memberships')
      order by tablename
    `)
    assert.deepEqual(
      openPolicies.rows.map((row) => [row.tablename, row.qual, row.with_check]),
      [
        ['community_identities', 'true', 'true'],
        ['community_memberships', 'true', 'true'],
        ['event_messages', 'true', 'true'],
      ],
    )

    // 原則 2：管理する権限のない部員には、他人の個人情報が見えない
    assert.equal(await visibleTo('rls-plain'), 1, '自分の行だけが見える')

    // 原則 2：アカウントの結び付けで権限を広げられない
    await assert.rejects(
      client.exec(`update public.app_accounts set member_id = '${id(607)}' where user_id = 'rls-plain'`),
      /only the account owner or a member manager/,
      '結び付け済みのアカウントを、本人が別の部員に付け替えられない',
    )
    await client.query(`select set_config('app.current_user_id', 'rls-outsider', false)`)
    await assert.rejects(
      client.exec(`update public.app_accounts set member_id = '${id(606)}' where user_id = 'rls-outsider'`),
      /only the account owner or a member manager/,
      'ロールを持つ部員に、自分を結び付けられない',
    )
    await client.exec(`update public.app_accounts set member_id = '${id(607)}' where user_id = 'rls-outsider'`)
    const linked = await client.query<{ member_id: string }>(`select member_id from public.app_accounts where user_id = 'rls-outsider'`)
    assert.equal(linked.rows[0].member_id, id(607), 'ロールのない部員には、本人が結び付けられる（入部申請）')
  } finally {
    await client.close()
  }
})
