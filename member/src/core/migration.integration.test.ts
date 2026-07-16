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

const createPlatformRolesAndAuthSchema = async (client: PGlite) => {
  await client.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid());
  `)
}

const createCurrentSchema = async (client: PGlite) => {
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
  `)
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
