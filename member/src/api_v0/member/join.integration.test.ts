import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { sign } from 'hono/jwt'
import { authMiddleware, type appUser } from '../../core/auth'
import { errorHandler } from '../../core/error'
import { getMemberService, joinMemberService } from './service'

type JsonResponse = {
  body: unknown
  status: number
}

const joinInput = {
  name: 'Test Member',
  grade: 1,
  emergencyContact: '090-0000-0000',
  studentId: 's0000000',
  studentEmail: 'test@example.ac.jp',
  insurance: true,
  someAllergy: false,
}

const unjoinedUser: appUser = {
  id: 'user-1',
  discordid: null,
  name: 'test-user',
  displayName: 'Test User',
  memberId: null,
  role: 'user',
}

const createRouteContext = (
  db: ReturnType<typeof drizzle>,
  currentUser: appUser,
) => ({
  req: {
    valid: () => joinInput,
  },
  get: (key: string) => {
    if (key === 'appUser') return currentUser
    if (key === 'db') return db
    throw new Error(`Unexpected context key: ${key}`)
  },
  json: (body: unknown, status: number): JsonResponse => ({ body, status }),
})

const asJsonResponse = (response: unknown): JsonResponse => response as JsonResponse

test('internal errors are logged without exposing details to API clients', async () => {
  const internalError = new Error('sensitive database detail')
  const loggedErrors: unknown[][] = []
  const originalConsoleError = console.error
  console.error = (...values: unknown[]) => loggedErrors.push(values)

  let response: unknown
  try {
    response = await errorHandler(
      internalError,
      {
        json: (body: unknown, status: number): JsonResponse => ({ body, status }),
      } as never,
    )
  } finally {
    console.error = originalConsoleError
  }

  assert.deepEqual(asJsonResponse(response), {
    body: { error: 'Internal Server Error' },
    status: 500,
  })
  assert.deepEqual(loggedErrors, [['Unhandled Exception:', internalError]])
})

test('join persists and links one member under RLS, then rejects a stale duplicate without an orphan', async () => {
  const client = await PGlite.create()

  try {
    await client.exec(`
      create table grades (
        id integer primary key,
        display_grade text not null
      );

      create table members (
        name text not null,
        grade integer not null references grades(id),
        emergency_contact text not null,
        student_id text not null,
        student_email text not null,
        insurance boolean default false not null,
        some_allergy boolean default false not null,
        created_at timestamp with time zone default now() not null,
        updated_at timestamp with time zone default now() not null,
        member_id uuid primary key default gen_random_uuid() not null
      );

      create table "user" (
        id text primary key,
        name text not null,
        discord_user_id text,
        display_name text,
        member_id uuid references members(member_id),
        role text default 'user' not null,
        updated_at timestamp not null
      );

      create table event_messages (
        id uuid primary key default gen_random_uuid()
      );

      insert into grades (id, display_grade) values (1, 'B1');
      insert into "user" (id, name, display_name, role, updated_at)
      values ('user-1', 'test-user', 'Test User', 'user', now());
    `)

    const rlsMigration = await readFile(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../../../share/drizzle/0007_soft_rls.sql',
      ),
      'utf8',
    )
    await client.exec(rlsMigration)
    await client.exec(`
      set role app_rls;
      select set_config('app.current_user_id', 'user-1', false);
      select set_config('app.current_member_id', '', false);
      select set_config('app.current_user_role', 'user', false);
    `)

    await assert.rejects(
      client.query(
        `insert into members (
          member_id, name, grade, emergency_contact, student_id, student_email
        ) values (
          '11111111-1111-4111-8111-111111111111',
          'Original broken path',
          1,
          '090-0000-0000',
          's0000001',
          'broken@example.ac.jp'
        ) returning *`,
      ),
      /row-level security policy/,
    )

    const db = drizzle(client)
    const joinResponse = asJsonResponse(
      await joinMemberService(createRouteContext(db, unjoinedUser) as never, async () => {}),
    )

    assert.equal(joinResponse.status, 201)
    const createdMember = joinResponse.body as { memberId: string }
    assert.match(createdMember.memberId, /^[0-9a-f-]{36}$/)

    await client.exec('reset role')
    const persisted = await client.query<{
      member_id: string
      linked_member_id: string
    }>(`
      select members.member_id, "user".member_id as linked_member_id
      from members
      join "user" on "user".member_id = members.member_id
      where "user".id = 'user-1'
    `)
    assert.deepEqual(persisted.rows, [{
      member_id: createdMember.memberId,
      linked_member_id: createdMember.memberId,
    }])

    await client.exec(`
      set role app_rls;
      select set_config('app.current_user_id', 'user-1', false);
      select set_config('app.current_member_id', '${createdMember.memberId}', false);
      select set_config('app.current_user_role', 'user', false);
    `)
    const getResponse = asJsonResponse(
      await getMemberService(createRouteContext(db, {
        ...unjoinedUser,
        memberId: createdMember.memberId,
      }) as never, async () => {}),
    )
    assert.equal(getResponse.status, 200)
    assert.equal((getResponse.body as { memberId: string }).memberId, createdMember.memberId)

    const duplicateResponse = asJsonResponse(
      await joinMemberService(createRouteContext(db, unjoinedUser) as never, async () => {}),
    )
    assert.deepEqual(duplicateResponse, {
      body: { error: 'Already joined' },
      status: 409,
    })

    await client.exec('reset role')
    const memberCount = await client.query<{ count: number }>('select count(*)::int as count from members')
    assert.equal(memberCount.rows[0].count, 1)
  } finally {
    await client.close()
  }
})

test('development auth reloads memberId from the database and downstream failures remain server errors', async () => {
  const client = await PGlite.create()

  try {
    const memberId = '22222222-2222-4222-8222-222222222222'
    await client.exec(`
      create role app_rls;
      create table members (member_id uuid primary key);
      create table "user" (
        id text primary key,
        name text not null,
        discord_user_id text,
        display_name text,
        member_id uuid references members(member_id),
        role text default 'user' not null,
        updated_at timestamp not null
      );
      insert into members (member_id) values ('${memberId}');
      insert into "user" (id, name, display_name, member_id, role, updated_at)
      values ('user-1', 'test-user', 'Test User', '${memberId}', 'user', now());
      grant app_rls to current_user;
      grant select on "user" to app_rls;
      set role app_rls;
    `)

    const db = drizzle(client)
    const captured: { user?: appUser } = {}
    let nextCalled = false
    const developmentContext = {
      env: {
        NODE_ENV: 'development',
        DEV_USER_ID: 'user-1',
      },
      req: {
        header: () => undefined,
      },
      get: (key: string) => {
        if (key === 'db') return db
        throw new Error(`Unexpected context key: ${key}`)
      },
      set: (key: string, value: appUser) => {
        assert.equal(key, 'appUser')
        captured.user = value
      },
      json: (body: unknown, status: number): JsonResponse => ({ body, status }),
    }

    await authMiddleware(developmentContext as never, async () => {
      nextCalled = true
      const rlsMemberId = await client.query<{ member_id: string }>(
        "select current_setting('app.current_member_id') as member_id",
      )
      assert.equal(rlsMemberId.rows[0].member_id, memberId)
    })

    assert.equal(nextCalled, true)
    assert.equal(captured.user?.memberId, memberId)

    const jwtSecret = 'test-secret-at-least-32-characters-long'
    const token = await sign({ id: 'user-1' }, jwtSecret, 'HS256')
    const productionContext = {
      ...developmentContext,
      env: {
        NODE_ENV: 'production',
        JWT_SECRET: jwtSecret,
      },
      req: {
        header: (name: string) => name === 'Authorization' ? `Bearer ${token}` : undefined,
      },
    }

    await assert.rejects(
      authMiddleware(productionContext as never, async () => {
        throw new Error('downstream database failure')
      }),
      /downstream database failure/,
    )
  } finally {
    await client.close()
  }
})
