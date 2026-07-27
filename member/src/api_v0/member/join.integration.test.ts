import assert from 'node:assert/strict'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { sql } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import { authMiddleware, type appUser } from '../../core/auth'
import { createRlsDatabase } from '../../core/db'
import { errorHandler } from '../../core/error'
import { AdminUpdateMemberSchema, JoinMemberSchema, RejectApplicationSchema, UpdateMemberSchema } from './schema'
import {
  createApproveMemberService,
  conflictForUniqueMemberField,
  getDirectoryService,
  getMemberService,
  joinMemberService,
  listAdminMembersService,
  rejectMemberService,
  updateAdminMemberService,
  updateMemberService,
} from './service'
import { chooseInitialDisplayName, type DiscordMembershipEvidence } from './verification'

type JsonResponse = { body: unknown; status: number }

const applicationInput = {
  name: '申請者 本人',
  grade: 1,
  emergencyContact: '090-0000-0000',
  studentId: 'applicant001',
  studentEmail: 'Applicant@Student.Example',
  insurance: true,
  someAllergy: false,
  allergyDetails: null,
}

const applicant: appUser = {
  id: 'test-applicant',
  name: 'Applicant',
  memberId: null,
  role: 'user',
}

const admin: appUser = {
  id: 'test-admin',
  name: 'Admin',
  memberId: null,
  role: 'admin',
}

const createContext = (
  db: ReturnType<typeof drizzle>,
  currentUser: appUser,
  options: {
    body?: unknown
    params?: Record<string, string>
    query?: Record<string, unknown>
  } = {},
) => {
  const responseHeaders = new Map<string, string>()
  let openTransactions = 0
  const rlsDatabase = {
    setIdentity: () => {},
    transaction: async <T>(operation: (tx: unknown) => Promise<T>): Promise<T> => {
      openTransactions += 1
      try {
        return await db.transaction(async (tx) => {
          await tx.execute(sql.raw('set local role app_rls'))
          await tx.execute(sql`
            select
              set_config('app.current_user_id', ${currentUser.id}, true),
              set_config('app.current_member_id', ${currentUser.memberId ?? ''}, true),
              set_config('app.current_user_role', ${currentUser.role}, true)
          `)
          return operation(tx)
        })
      } finally {
        openTransactions -= 1
      }
    },
  }
  return {
    context: {
      env: {
        DISCORD_GUILD_ID: 'guild-1',
        DISCORD_TOKEN: 'test-discord-bot-token',
        MEMBERSHIP_EVIDENCE_MAX_AGE_SECONDS: '300',
      },
      req: {
        valid: (target: string) => {
          if (target === 'json') return options.body
          if (target === 'param') return options.params ?? {}
          if (target === 'query') return options.query ?? {}
          throw new Error(`Unexpected validation target: ${target}`)
        },
      },
      get: (key: string) => {
        if (key === 'appUser') return currentUser
        if (key === 'db') return rlsDatabase
        throw new Error(`Unexpected context key: ${key}`)
      },
      header: (name: string, value: string) => responseHeaders.set(name, value),
      json: (body: unknown, status: number): JsonResponse => ({ body, status }),
    },
    responseHeaders,
    isTransactionOpen: () => openTransactions > 0,
  }
}

const asResponse = (response: unknown) => response as JsonResponse
const callHandler = (handler: Function, context: unknown) => handler(context, async () => {})

const setupWorkflowDatabase = async () => {
  const client = await PGlite.create()
  await client.exec(`
    create role app_rls;
    grant app_rls to current_user;

    create table grades (
      id integer primary key,
      code text not null unique,
      display_grade text not null unique,
      sort_order smallint not null unique,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table members (
      member_id uuid primary key default gen_random_uuid(),
      registered_name text not null,
      grade_id integer not null references grades(id),
      emergency_contact text not null,
      student_id text not null,
      student_email text not null,
      insurance boolean not null default false,
      some_allergy boolean not null default false,
      allergy_details text,
      member_status text not null default 'pending'
        check (member_status in ('pending', 'active', 'rejected', 'withdrawn')),
      application_version integer not null default 1 check (application_version > 0),
      submitted_at timestamptz not null default now(),
      reviewed_at timestamptz,
      reviewed_by_user_id text,
      review_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint members_rejection_reason_required check (
        member_status <> 'rejected' or btrim(coalesce(review_reason, '')) <> ''
      )
    );
    create unique index members_student_id_unique on members(student_id);
    create unique index members_student_email_unique on members(student_email);

    create schema app_auth;
    create table app_auth."user" (
      id text primary key,
      name text not null,
      email text not null unique,
      email_verified boolean not null,
      image text,
      created_at timestamp not null,
      updated_at timestamp not null
    );

    -- Domain-side account record; user_id is a value, not a foreign key.
    create table app_accounts (
      user_id text primary key,
      member_id uuid unique references members(member_id),
      role text not null default 'user',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table account (
      id text primary key,
      account_id text not null,
      provider_id text not null,
      user_id text not null references app_auth."user"(id),
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

    create table member_directory_profiles (
      member_id uuid primary key references members(member_id),
      display_name text not null,
      skills text[] not null default array[]::text[],
      interests text[] not null default array[]::text[],
      current_activities text not null default '',
      bio text not null default '',
      directory_visible boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table community_identities (
      identity_id uuid primary key default gen_random_uuid(),
      user_id text not null,
      auth_account_id text not null unique,
      provider text not null,
      provider_account_id text not null,
      username text not null,
      provider_display_name text,
      avatar_url text,
      oauth_verified_at timestamptz not null,
      last_synced_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table community_memberships (
      identity_id uuid not null references community_identities(identity_id),
      community_id text not null,
      membership_status text not null,
      nickname text,
      role_ids text[] not null default array[]::text[],
      role_names text[] not null default array[]::text[],
      verified_at timestamptz,
      last_checked_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key(identity_id, community_id)
    );

    create table member_status_history (
      history_id bigint generated always as identity primary key,
      member_id uuid not null references members(member_id),
      from_status text,
      to_status text not null,
      changed_by_user_id text,
      reason text,
      created_at timestamptz not null default now()
    );

    insert into grades(id, code, display_grade, sort_order) values
      (1, 'B1', 'B1', 10),
      (2, 'B2', 'B2', 20);
    insert into app_auth."user"(id, name, email, email_verified, created_at, updated_at) values
      ('test-admin', 'Admin', 'admin@example.test', true, now(), now()),
      ('test-applicant', 'Applicant', 'applicant@example.test', true, now(), now());
    insert into app_accounts(user_id, role) values
      ('test-admin', 'admin'),
      ('test-applicant', 'user');
    insert into account(id, account_id, provider_id, user_id, created_at, updated_at) values
      ('discord-account', 'discord-user-1', 'discord', 'test-applicant', now(), now());
    insert into community_identities(
      identity_id, user_id, auth_account_id, provider, provider_account_id,
      username, provider_display_name, oauth_verified_at
    ) values (
      '10000000-0000-4000-8000-000000000001', 'test-applicant',
      'discord-account', 'discord', 'discord-user-1', 'applicant-user',
      'Provider Display', now()
    );
    insert into community_memberships(
      identity_id, community_id, membership_status, nickname, role_names,
      verified_at, last_checked_at
    ) values (
      '10000000-0000-4000-8000-000000000001', 'guild-1', 'member',
      'Guild Nickname', array['部員'], now(), now()
    );

    create schema app_api;
    create view app_api.member_directory_entries as
      select
        profile.member_id,
        profile.display_name,
        grade.code as grade_code,
        grade.display_grade,
        profile.skills,
        profile.interests,
        profile.current_activities,
        profile.bio,
        jsonb_build_array(jsonb_build_object(
          'provider', identity.provider,
          'communityId', membership.community_id,
          'nickname', membership.nickname,
          'roles', membership.role_names
        )) as communities
      from member_directory_profiles profile
      join members member on member.member_id = profile.member_id
      join grades grade on grade.id = member.grade_id
      join app_accounts account on account.member_id = member.member_id
      join community_identities identity on identity.user_id = account.user_id
      join community_memberships membership on membership.identity_id = identity.identity_id
      where profile.directory_visible and member.member_status = 'active';

    grant usage on schema public, app_api, app_auth to app_rls;
    grant select on grades to app_rls;
    grant select, insert, update on members, member_directory_profiles to app_rls;
    grant select on app_auth."user" to app_rls;
    grant select, insert, update on app_accounts to app_rls;
    grant select on account, community_identities, community_memberships, member_status_history to app_rls;
    grant update on community_identities to app_rls;
    grant insert, update on community_memberships to app_rls;
    grant select on app_api.member_directory_entries to app_rls;

    alter table grades enable row level security;
    alter table members enable row level security;
    alter table member_directory_profiles enable row level security;
    alter table app_auth."user" enable row level security;
    alter table app_accounts enable row level security;
    alter table account enable row level security;
    alter table community_identities enable row level security;
    alter table community_memberships enable row level security;
    alter table member_status_history enable row level security;

    create policy grades_read on grades for select to app_rls using (
      current_setting('app.current_user_id', true) <> ''
    );
    create policy users_all on app_auth."user" for all to app_rls using (true) with check (true);
    create policy accounts_all on app_accounts for all to app_rls using (true) with check (true);
    create policy account_read on account for select to app_rls using (true);
    create policy members_read on members for select to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    );
    create policy members_insert on members for insert to app_rls with check (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    );
    create policy members_update on members for update to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    ) with check (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    );
    create policy profiles_read on member_directory_profiles for select to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    );
    create policy profiles_insert on member_directory_profiles for insert to app_rls with check (
      current_setting('app.current_user_role', true) = 'admin'
    );
    create policy profiles_update on member_directory_profiles for update to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    ) with check (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    );
    create policy identities_read on community_identities for select to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
      or user_id = current_setting('app.current_user_id', true)
    );
    create policy identities_update on community_identities for update to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
    ) with check (current_setting('app.current_user_role', true) = 'admin');
    create policy memberships_read on community_memberships for select to app_rls using (true);
    create policy memberships_insert on community_memberships for insert to app_rls with check (
      current_setting('app.current_user_role', true) = 'admin'
    );
    create policy memberships_update on community_memberships for update to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
    ) with check (current_setting('app.current_user_role', true) = 'admin');
    create policy history_read on member_status_history for select to app_rls using (
      current_setting('app.current_user_role', true) = 'admin'
      or member_id = nullif(current_setting('app.current_member_id', true), '')::uuid
    );
  `)
  return { client, db: drizzle(client) }
}

test('membership application uses one versioned row through reject, resubmit, approval, self edit, and ledgers', async () => {
  const { client, db } = await setupWorkflowDatabase()
  try {
    const joinContext = createContext(db, applicant, { body: applicationInput })
    const created = asResponse(await callHandler(joinMemberService, joinContext.context as never))
    assert.equal(created.status, 201)
    assert.equal(joinContext.responseHeaders.get('Cache-Control'), 'private, no-store, max-age=0')
    const pending = created.body as { memberId: string; memberStatus: string; applicationVersion: number; studentId: string; studentEmail: string }
    assert.equal(pending.memberStatus, 'pending')
    assert.equal(pending.applicationVersion, 1)
    assert.equal(pending.studentId, 'APPLICANT001')
    assert.equal(pending.studentEmail, 'applicant@student.example')
    const memberId = pending.memberId

    await client.exec('reset role')
    const linked = await client.query<{ member_id: string }>(`select member_id from app_accounts where user_id = 'test-applicant'`)
    assert.equal(linked.rows[0].member_id, memberId)
    const initialProfileCount = await client.query<{ count: number }>('select count(*)::int as count from member_directory_profiles')
    assert.equal(initialProfileCount.rows[0].count, 0)

    const linkedApplicant = { ...applicant, memberId }
    const editedPending = asResponse(await callHandler(updateMemberService, createContext(db, linkedApplicant, {
      body: {
        expectedVersion: 1,
        name: '申請者 更新',
        studentId: 'applicant002',
        studentEmail: 'updated@student.example',
      },
    }).context as never))
    assert.equal(editedPending.status, 200)
    assert.equal((editedPending.body as { applicationVersion: number }).applicationVersion, 2)

    const forbiddenLedger = asResponse(await callHandler(listAdminMembersService, createContext(db, linkedApplicant, {
      query: { limit: 50 },
    }).context as never))
    assert.equal(forbiddenLedger.status, 403)

    const staleReject = asResponse(await callHandler(rejectMemberService, createContext(db, admin, {
      params: { id: memberId },
      body: { expectedVersion: 1, reason: '不足' },
    }).context as never))
    assert.equal(staleReject.status, 409)

    const rejected = asResponse(await callHandler(rejectMemberService, createContext(db, admin, {
      params: { id: memberId },
      body: { expectedVersion: 2, reason: '活動内容を追記してください' },
    }).context as never))
    assert.equal(rejected.status, 200)
    assert.deepEqual(
      (({ memberStatus, applicationVersion, reviewReason }) => ({ memberStatus, applicationVersion, reviewReason }))(
        rejected.body as { memberStatus: string; applicationVersion: number; reviewReason: string },
      ),
      { memberStatus: 'rejected', applicationVersion: 3, reviewReason: '活動内容を追記してください' },
    )

    const staleResubmit = asResponse(await callHandler(joinMemberService, createContext(db, linkedApplicant, {
      body: { ...applicationInput, expectedVersion: 2 },
    }).context as never))
    assert.equal(staleResubmit.status, 409)
    const resubmitted = asResponse(await callHandler(joinMemberService, createContext(db, linkedApplicant, {
      body: { ...applicationInput, name: '再申請 本人', expectedVersion: 3 },
    }).context as never))
    assert.equal(resubmitted.status, 200)
    assert.equal((resubmitted.body as { memberId: string }).memberId, memberId)
    assert.equal((resubmitted.body as { memberStatus: string }).memberStatus, 'pending')
    assert.equal((resubmitted.body as { applicationVersion: number }).applicationVersion, 4)

    let discordFetchCalls = 0
    let isApprovalTransactionOpen = () => false
    const approvalNow = new Date('2026-07-16T12:00:00Z')
    const approve = createApproveMemberService({
      now: () => approvalNow,
      fetchImpl: async (input) => {
        assert.equal(isApprovalTransactionOpen(), false)
        discordFetchCalls += 1
        const url = String(input)
        if (url.endsWith('/roles')) {
          return new Response(JSON.stringify([{ id: 'role-1', name: '部員' }]), { status: 200 })
        }
        return new Response(JSON.stringify({
          nick: 'Guild Nickname',
          roles: ['role-1'],
          user: {
            id: 'discord-user-1',
            username: 'applicant-user',
            global_name: 'Provider Display Updated',
            avatar: null,
          },
        }), { status: 200 })
      },
    })

    const staleApprove = asResponse(await callHandler(approve, createContext(db, admin, {
      params: { id: memberId },
      body: { expectedVersion: 3 },
    }).context as never))
    assert.equal(staleApprove.status, 409)
    assert.equal(discordFetchCalls, 0)

    const approvalContext = createContext(db, admin, {
      params: { id: memberId },
      body: { expectedVersion: 4 },
    })
    isApprovalTransactionOpen = approvalContext.isTransactionOpen
    const approved = asResponse(await callHandler(approve, approvalContext.context as never))
    assert.equal(approved.status, 200)
    assert.equal(discordFetchCalls, 2)
    const active = approved.body as {
      memberStatus: string
      applicationVersion: number
      directoryProfile: { displayName: string }
      discord: { roles: string[] }
    }
    assert.equal(active.memberStatus, 'active')
    assert.equal(active.applicationVersion, 5)
    assert.equal(active.directoryProfile.displayName, 'Guild Nickname')
    assert.deepEqual(active.discord.roles, ['部員'])

    const duplicateApproval = asResponse(await callHandler(approve, createContext(db, admin, {
      params: { id: memberId },
      body: { expectedVersion: 4 },
    }).context as never))
    assert.equal(duplicateApproval.status, 409)

    const forbiddenIdentityEdit = asResponse(await callHandler(updateMemberService, createContext(db, linkedApplicant, {
      body: { expectedVersion: 5, name: '承認後の改名' },
    }).context as never))
    assert.equal(forbiddenIdentityEdit.status, 400)

    const selfUpdated = asResponse(await callHandler(updateMemberService, createContext(db, linkedApplicant, {
      body: {
        expectedVersion: 5,
        grade: 2,
        emergencyContact: '080-1111-2222',
        insurance: false,
        someAllergy: true,
        allergyDetails: 'そば',
        displayName: '公開名',
        skills: ['TypeScript'],
        interests: ['Robotics'],
        currentActivities: 'ロボット製作',
        bio: '自己紹介',
      },
    }).context as never))
    assert.equal(selfUpdated.status, 200)
    assert.equal((selfUpdated.body as { applicationVersion: number }).applicationVersion, 6)
    assert.equal((selfUpdated.body as { name: string }).name, '再申請 本人')
    assert.equal((selfUpdated.body as { directoryProfile: { displayName: string } }).directoryProfile.displayName, '公開名')

    const directoryContext = createContext(db, linkedApplicant)
    const directory = asResponse(await callHandler(getDirectoryService, directoryContext.context as never))
    assert.equal(directory.status, 200)
    const directoryRow = (directory.body as Array<Record<string, unknown>>)[0]
    assert.deepEqual(Object.keys(directoryRow).sort(), [
      'bio', 'communities', 'currentActivities', 'displayGrade', 'displayName',
      'gradeCode', 'interests', 'memberId', 'skills',
    ])
    assert.equal(directoryRow.studentId, undefined)
    assert.equal(directoryRow.studentEmail, undefined)

    const adminUpdated = asResponse(await callHandler(updateAdminMemberService, createContext(db, admin, {
      params: { id: memberId },
      body: {
        expectedVersion: 6,
        name: '管理者修正氏名',
        studentId: 'adminfixed001',
        studentEmail: 'AdminFixed@Student.Example',
      },
    }).context as never))
    assert.equal(adminUpdated.status, 200)
    assert.equal((adminUpdated.body as { applicationVersion: number }).applicationVersion, 7)

    const ledgerContext = createContext(db, admin, { query: { limit: 50 } })
    const ledger = asResponse(await callHandler(listAdminMembersService, ledgerContext.context as never))
    assert.equal(ledger.status, 200)
    assert.equal(ledgerContext.responseHeaders.get('Cache-Control'), 'private, no-store, max-age=0')
    const ledgerRow = (ledger.body as { items: Array<{ studentId: string; studentEmail: string }> }).items[0]
    assert.equal(ledgerRow.studentId, 'ADMINFIXED001')
    assert.equal(ledgerRow.studentEmail, 'adminfixed@student.example')

    const withdrawn = asResponse(await callHandler(updateAdminMemberService, createContext(db, admin, {
      params: { id: memberId },
      body: {
        expectedVersion: 7,
        memberStatus: 'withdrawn',
        reason: '退部処理',
      },
    }).context as never))
    assert.equal(withdrawn.status, 200)
    assert.equal((withdrawn.body as { memberStatus: string }).memberStatus, 'withdrawn')
    assert.equal((withdrawn.body as { applicationVersion: number }).applicationVersion, 8)
  } finally {
    await client.close()
  }
})

test('submission fails before writing when verified target-guild membership is absent', async () => {
  const { client, db } = await setupWorkflowDatabase()
  try {
    await client.exec(`update community_memberships set membership_status = 'not_member', verified_at = null`)
    const response = asResponse(await callHandler(joinMemberService, createContext(db, applicant, { body: applicationInput }).context as never))
    assert.deepEqual(response, {
      body: {
        error: 'A verified Discord identity and target-guild membership are required',
        code: 'discord_membership_required',
      },
      status: 409,
    })
    await client.exec('reset role')
    const count = await client.query<{ count: number }>('select count(*)::int as count from members')
    assert.equal(count.rows[0].count, 0)
  } finally {
    await client.close()
  }
})

test('submission rejects stale cached guild evidence before writing', async () => {
  const { client, db } = await setupWorkflowDatabase()
  try {
    await client.exec(`update community_memberships set last_checked_at = '2020-01-01T00:00:00Z'`)
    const response = asResponse(await callHandler(joinMemberService, createContext(db, applicant, {
      body: applicationInput,
    }).context as never))
    assert.equal(response.status, 409)
    assert.equal((response.body as { code: string }).code, 'discord_membership_stale')
    await client.exec('reset role')
    const count = await client.query<{ count: number }>('select count(*)::int as count from members')
    assert.equal(count.rows[0].count, 0)
  } finally {
    await client.close()
  }
})

test('empty RLS context can use auth tables but cannot read business data', async () => {
  const { client } = await setupWorkflowDatabase()
  try {
    await client.exec(`
      begin;
      set local role app_rls;
      select set_config('app.current_user_id', '', true);
      select set_config('app.current_member_id', '', true);
      select set_config('app.current_user_role', '', true);
    `)
    const authUsers = await client.query<{ count: number }>(
      'select count(*)::int as count from app_auth."user"',
    )
    const gradeRows = await client.query<{ count: number }>(
      'select count(*)::int as count from grades',
    )
    const memberRows = await client.query<{ count: number }>(
      'select count(*)::int as count from members',
    )
    assert.equal(authUsers.rows[0].count, 2)
    assert.equal(gradeRows.rows[0].count, 0)
    assert.equal(memberRows.rows[0].count, 0)
  } finally {
    await client.exec('rollback')
    await client.close()
  }
})

test('approval maps Discord Unknown Member to 409 and guild/upstream failures to 502 without activation', async () => {
  for (const scenario of [
    { discordStatus: 404, discordCode: 10007, apiStatus: 409, code: 'discord_membership_required' },
    { discordStatus: 404, discordCode: 10004, apiStatus: 502, code: 'discord_verification_unavailable' },
    { discordStatus: 429, discordCode: null, apiStatus: 502, code: 'discord_verification_unavailable' },
    { discordStatus: 500, discordCode: null, apiStatus: 502, code: 'discord_verification_unavailable' },
  ]) {
    const { client, db } = await setupWorkflowDatabase()
    try {
      const created = asResponse(await callHandler(joinMemberService, createContext(db, applicant, {
        body: applicationInput,
      }).context as never))
      const memberId = (created.body as { memberId: string }).memberId

      const approve = createApproveMemberService({
        now: () => new Date('2026-07-16T12:00:00Z'),
        fetchImpl: async () => new Response(
          scenario.discordCode === null ? '' : JSON.stringify({ code: scenario.discordCode }),
          { status: scenario.discordStatus },
        ),
      })
      const response = asResponse(await callHandler(approve, createContext(db, admin, {
        params: { id: memberId },
        body: { expectedVersion: 1 },
      }).context as never))
      assert.equal(response.status, scenario.apiStatus)
      assert.equal((response.body as { code: string }).code, scenario.code)

      await client.exec('reset role')
      const application = await client.query<{ member_status: string; application_version: number }>(`
        select member_status, application_version from members where member_id = '${memberId}'
      `)
      assert.deepEqual(application.rows, [{ member_status: 'pending', application_version: 1 }])

      if (scenario.discordCode === 10007) {
        const membership = await client.query<{ membership_status: string; verified_at: string | null }>(`
          select membership_status, verified_at from community_memberships where community_id = 'guild-1'
        `)
        assert.deepEqual(membership.rows, [{ membership_status: 'not_member', verified_at: null }])
      } else if (scenario.discordCode === 10004) {
        const membership = await client.query<{ membership_status: string }>(`
          select membership_status from community_memberships where community_id = 'guild-1'
        `)
        assert.deepEqual(membership.rows, [{ membership_status: 'member' }])
      }
    } finally {
      await client.close()
    }
  }
})

test('rejection schema requires a non-blank reason', () => {
  assert.equal(RejectApplicationSchema.safeParse({ expectedVersion: 1, reason: '  ' }).success, false)
  assert.equal(RejectApplicationSchema.safeParse({ expectedVersion: 1, reason: '不足項目あり' }).success, true)
})

test('self and admin update schemas reject internal IDs and timestamps, and self cannot manage visibility', () => {
  assert.equal(JoinMemberSchema.safeParse({ ...applicationInput, memberStatus: 'active' }).success, false)
  assert.equal(UpdateMemberSchema.safeParse({ expectedVersion: 1, memberId: crypto.randomUUID() }).success, false)
  assert.equal(UpdateMemberSchema.safeParse({ expectedVersion: 1, createdAt: new Date().toISOString() }).success, false)
  assert.equal(UpdateMemberSchema.safeParse({ expectedVersion: 1, directoryVisible: false }).success, false)
  assert.equal(AdminUpdateMemberSchema.safeParse({ expectedVersion: 1, memberId: crypto.randomUUID() }).success, false)
  assert.equal(AdminUpdateMemberSchema.safeParse({ expectedVersion: 1, updatedAt: new Date().toISOString() }).success, false)
})

test('initial public display name follows guild nickname, provider display name, then username', () => {
  const evidence: DiscordMembershipEvidence = {
    identityId: crypto.randomUUID(),
    username: 'username',
    providerDisplayName: 'Provider Name',
    avatarUrl: null,
    communityId: 'guild-1',
    nickname: 'Guild Nickname',
    roles: [],
    verifiedAt: '2026-07-16T00:00:00Z',
    lastCheckedAt: '2026-07-16T00:00:00Z',
  }
  assert.equal(chooseInitialDisplayName(evidence), 'Guild Nickname')
  assert.equal(chooseInitialDisplayName({ ...evidence, nickname: ' ' }), 'Provider Name')
  assert.equal(chooseInitialDisplayName({ ...evidence, nickname: null, providerDisplayName: null }), 'username')
})

test('wrapped Postgres unique violations map to field-specific API conflicts', () => {
  assert.deepEqual(conflictForUniqueMemberField({
    cause: { code: '23505', constraint: 'members_student_id_unique' },
  }), {
    error: 'Student ID is already registered',
    code: 'student_id_conflict',
  })
  assert.deepEqual(conflictForUniqueMemberField({
    cause: { cause: { code: '23505', constraint: 'members_student_email_unique' } },
  }), {
    error: 'Student email is already registered',
    code: 'student_email_conflict',
  })
})

test('internal errors are logged without exposing details to API clients', async () => {
  const internalError = new Error('sensitive database detail')
  const loggedErrors: unknown[][] = []
  const originalConsoleError = console.error
  console.error = (...values: unknown[]) => loggedErrors.push(values)
  try {
    const response = await errorHandler(internalError, {
      json: (body: unknown, status: number): JsonResponse => ({ body, status }),
    } as never)
    assert.deepEqual(asResponse(response), { body: { error: 'Internal Server Error' }, status: 500 })
    assert.deepEqual(loggedErrors, [['Unhandled Exception:', internalError]])
  } finally {
    console.error = originalConsoleError
  }
})

test('development auth reloads memberId and downstream failures remain server errors', async () => {
  const client = await PGlite.create()
  try {
    const memberId = '22222222-2222-4222-8222-222222222222'
    await client.exec(`
      create role app_rls;
      create table members (member_id uuid primary key);
      create schema app_auth;
      create table app_auth."user" (
        id text primary key,
        name text not null
      );
      create table app_accounts (
        user_id text primary key,
        member_id uuid references members(member_id),
        role text default 'user' not null
      );
      create table app_auth.session (
        id text primary key,
        user_id text not null references app_auth."user"(id),
        expires_at timestamp not null
      );
      insert into members values ('${memberId}');
      insert into app_auth."user" values ('user-1', 'test-user');
      insert into app_accounts values ('user-1', '${memberId}', 'user');
      insert into app_auth.session values ('session-1', 'user-1', now() + interval '1 hour');
      grant app_rls to current_user;
      grant usage on schema app_auth to app_rls;
      grant select on app_auth."user", app_auth.session to app_rls;
      grant select on app_accounts to app_rls;
      set role app_rls;
    `)
    const db = createRlsDatabase(drizzle(client) as never)
    let captured: appUser | undefined
    const baseContext = {
      env: { NODE_ENV: 'development', DEV_USER_ID: 'user-1' },
      req: { header: () => undefined },
      get: (key: string) => key === 'db' ? db : undefined,
      set: (_key: string, value: appUser) => { captured = value },
      json: (body: unknown, status: number): JsonResponse => ({ body, status }),
    }
    await authMiddleware(baseContext as never, async () => {})
    assert.equal(captured?.memberId, memberId)

    const secret = 'test-secret-at-least-32-characters-long'
    const token = await sign({ id: 'user-1', sid: 'session-1' }, secret, 'HS256')
    await assert.rejects(
      authMiddleware({
        ...baseContext,
        env: { NODE_ENV: 'production', JWT_SECRET: secret },
        req: { header: (name: string) => name === 'Authorization' ? `Bearer ${token}` : undefined },
      } as never, async () => { throw new Error('downstream database failure') }),
      /downstream database failure/,
    )
  } finally {
    await client.close()
  }
})
