// migration を実際に流して確かめるテストの、共通の準備処理。
// 既存のスキーマを再現し、migration を順に流し、部員を本物と同じ手順で作る。
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'

export const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/20260716005139_reconcile_better_auth_baseline.sql',
)
export const membershipWorkflowMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/20260716123951_membership_workflow.sql',
)
export const splitAuthSchemaMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/20260727000000_split_auth_schema.sql',
)
export const roleTablesMigrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/20260904000000_add_role_tables.sql',
)
export const createPlatformRolesAndAuthSchema = async (client: PGlite) => {
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

export const createCurrentSchema = async (client: PGlite, withFixture = true) => {
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

export const replayThroughSplit = async (client: PGlite) => {
  await createCurrentSchema(client, false)
  await client.exec(await readFile(membershipWorkflowMigrationPath, 'utf8'))
  await client.exec(await readFile(splitAuthSchemaMigrationPath, 'utf8'))
}

// Seeding has to follow the real path: the trigger cross-checks the role the
// caller claims against app_accounts, so an actor cannot simply assert it is an
// admin. The first admin is bootstrapped the way production was — apply, then
// promote the column directly — because approving requires an admin to exist.
export const applyAsNewUser = async (
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

export const promoteToAdmin = (client: PGlite, userId: string) =>
  client.exec(`update public.app_accounts set role = 'admin' where user_id = '${userId}'`)

export const approveMember = (client: PGlite, adminUserId: string, memberId: string) =>
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


// これまでのすべての migration を、ロール関連まで含めて流す。
// 呼ぶ前に、applyAsNewUser などで部員を作っておく（U-1 の migration が、そのときの管理者からロールを作るため）。
export const replayThroughLatest = async (client: PGlite) => {
  const migrationsDirectory = dirname(roleTablesMigrationPath)
  for (const name of [
    '20260904000000_add_role_tables.sql',
    '20261105072955_enforce_permissions.sql',
    '20261109180000_role_history_and_last_manager.sql',
    '20261110090000_remove_roles_on_withdrawal.sql',
  ]) {
    await client.exec(await readFile(resolve(migrationsDirectory, name), 'utf8'))
  }
}
