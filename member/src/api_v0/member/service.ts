import type { Context } from 'hono'
import type { RouteHandler } from '@hono/zod-openapi'
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import {
  appAccounts,
  grades,
  memberDirectoryProfiles,
  members,
  memberStatusHistory,
  user,
} from '../../../../share/drizzle/schema'
import type { AppContext } from '../../core/types'
import type { AppTransaction, RlsDatabase } from '../../core/db'
import {
  approveMemberRoute,
  getAdminMemberRoute,
  getDirectoryRoute,
  getMemberRoute,
  joinMemberRoute,
  listAdminMembersRoute,
  rejectMemberRoute,
  updateAdminMemberRoute,
  updateMemberRoute,
} from './schema'
import {
  chooseInitialDisplayName,
  DiscordIdentityMissingError,
  DiscordMemberNotFoundError,
  DiscordVerificationUpstreamError,
  isMembershipEvidenceFresh,
  readDiscordMembershipEvidence,
  readDiscordMembershipEvidenceMap,
  refreshDiscordMembershipEvidence,
  resolveEvidenceMaxAgeMilliseconds,
  type DiscordMembershipEvidence,
} from './verification'

type Database = RlsDatabase
type QueryDatabase = AppTransaction
type MemberStatus = 'pending' | 'active' | 'rejected' | 'withdrawn'

class MemberLinkConflictError extends Error {}
class MemberVersionConflictError extends Error {}

const memberSelection = {
  memberId: members.memberId,
  name: members.name,
  grade: members.grade,
  displayGrade: grades.displayGrade,
  emergencyContact: members.emergencyContact,
  studentId: members.studentId,
  studentEmail: members.studentEmail,
  insurance: members.insurance,
  someAllergy: members.someAllergy,
  allergyDetails: members.allergyDetails,
  memberStatus: members.memberStatus,
  applicationVersion: members.applicationVersion,
  submittedAt: members.submittedAt,
  reviewedAt: members.reviewedAt,
  reviewReason: members.reviewReason,
  createdAt: members.createdAt,
  updatedAt: members.updatedAt,
  profileMemberId: memberDirectoryProfiles.memberId,
  displayName: memberDirectoryProfiles.displayName,
  skills: memberDirectoryProfiles.skills,
  interests: memberDirectoryProfiles.interests,
  currentActivities: memberDirectoryProfiles.currentActivities,
  bio: memberDirectoryProfiles.bio,
  directoryVisible: memberDirectoryProfiles.directoryVisible,
  userId: appAccounts.userId,
}

const selectMemberRows = async (
  db: QueryDatabase,
  where: SQL | undefined,
  limit?: number,
) => {
  let query = db
    .select(memberSelection)
    .from(members)
    .innerJoin(grades, eq(grades.id, members.grade))
    .innerJoin(appAccounts, eq(appAccounts.memberId, members.memberId))
    .leftJoin(memberDirectoryProfiles, eq(memberDirectoryProfiles.memberId, members.memberId))
    .where(where)
    .orderBy(desc(members.submittedAt), desc(members.memberId))
    .$dynamic()

  if (limit !== undefined) query = query.limit(limit)
  return query
}

type MemberRow = Awaited<ReturnType<typeof selectMemberRows>>[number]

const loadMemberRow = async (db: QueryDatabase, memberId: string) => {
  const [row] = await selectMemberRows(db, eq(members.memberId, memberId), 1)
  return row ?? null
}

const toDiscordResponse = (evidence: DiscordMembershipEvidence | null) => {
  if (!evidence) return null
  return {
    username: evidence.username,
    providerDisplayName: evidence.providerDisplayName,
    avatarUrl: evidence.avatarUrl,
    communityId: evidence.communityId,
    nickname: evidence.nickname,
    roles: evidence.roles,
    verifiedAt: evidence.verifiedAt,
    lastCheckedAt: evidence.lastCheckedAt,
  }
}

const toMemberResponse = (row: MemberRow, evidence: DiscordMembershipEvidence | null) => ({
  memberId: row.memberId,
  name: row.name,
  grade: row.grade,
  displayGrade: row.displayGrade,
  emergencyContact: row.emergencyContact,
  studentId: row.studentId,
  studentEmail: row.studentEmail,
  insurance: row.insurance,
  someAllergy: row.someAllergy,
  allergyDetails: row.allergyDetails,
  memberStatus: row.memberStatus as MemberStatus,
  applicationVersion: row.applicationVersion,
  submittedAt: row.submittedAt,
  reviewedAt: row.reviewedAt,
  reviewReason: row.reviewReason,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  directoryProfile: row.profileMemberId ? {
    displayName: row.displayName as string,
    skills: row.skills as string[],
    interests: row.interests as string[],
    currentActivities: row.currentActivities as string,
    bio: row.bio as string,
    directoryVisible: row.directoryVisible as boolean,
  } : null,
  discord: toDiscordResponse(evidence),
})

// The account email belongs to the authentication store. It is looked up by id
// instead of joined, so it becomes a remote call if that store moves to its own
// database.
const readAuthEmails = async (db: QueryDatabase, userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, string>()
  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, userIds))
  return new Map(rows.map(row => [row.id, row.email]))
}

const toAdminMemberResponse = (
  row: MemberRow,
  evidence: DiscordMembershipEvidence | null,
  userEmail: string,
) => ({
  ...toMemberResponse(row, evidence),
  userId: row.userId,
  userEmail,
})

const setPrivateNoStore = (c: Context<AppContext>) => {
  c.header('Cache-Control', 'private, no-store, max-age=0')
  c.header('Pragma', 'no-cache')
}

const requireGuildId = (c: Context<AppContext>) => {
  const guildId = c.env.DISCORD_GUILD_ID?.trim()
  if (!guildId) throw new Error('DISCORD_GUILD_ID is not configured')
  return guildId
}

const normalizeApplication = (input: {
  name: string
  grade: number
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails?: string | null
}) => ({
  name: input.name.trim(),
  grade: input.grade,
  emergencyContact: input.emergencyContact.trim(),
  studentId: input.studentId.trim().toUpperCase(),
  studentEmail: input.studentEmail.trim().toLowerCase(),
  insurance: input.insurance,
  someAllergy: input.someAllergy,
  allergyDetails: input.someAllergy ? input.allergyDetails?.trim() || null : null,
})

export const conflictForUniqueMemberField = (error: unknown) => {
  let databaseError = error as { code?: string; constraint?: string; cause?: unknown }
  for (let depth = 0; depth < 4 && !databaseError.code && databaseError.cause; depth += 1) {
    databaseError = databaseError.cause as { code?: string; constraint?: string; cause?: unknown }
  }
  if (databaseError.code !== '23505') return null
  if (databaseError.constraint === 'members_student_id_unique') {
    return { error: 'Student ID is already registered', code: 'student_id_conflict' }
  }
  if (databaseError.constraint === 'members_student_email_unique') {
    return { error: 'Student email is already registered', code: 'student_email_conflict' }
  }
  return { error: 'Application conflicts with an existing record', code: 'application_conflict' }
}

const encodeCursor = (row: Pick<MemberRow, 'submittedAt' | 'memberId'>) => (
  btoa(JSON.stringify({ submittedAt: row.submittedAt, memberId: row.memberId }))
)

const decodeCursor = (value: string) => {
  try {
    const parsed = JSON.parse(atob(value)) as { submittedAt?: unknown; memberId?: unknown }
    if (typeof parsed.submittedAt !== 'string' || !Number.isFinite(Date.parse(parsed.submittedAt))) return null
    if (typeof parsed.memberId !== 'string' || !/^[0-9a-f-]{36}$/i.test(parsed.memberId)) return null
    return { submittedAt: parsed.submittedAt, memberId: parsed.memberId }
  } catch {
    return null
  }
}

const loadResponseForMember = async (db: QueryDatabase, memberId: string, guildId: string) => {
  const row = await loadMemberRow(db, memberId)
  if (!row) return null
  const evidence = await readDiscordMembershipEvidence(db, row.userId, guildId)
  return { row, evidence }
}

export const joinMemberService: RouteHandler<typeof joinMemberRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (!appUser) return c.json({ error: 'Unauthorized', code: 'unauthorized' }, 401)

  const db = c.get('db')
  const guildId = requireGuildId(c)
  const evidence = await db.transaction((tx) => readDiscordMembershipEvidence(tx, appUser.id, guildId))
  if (!evidence) {
    return c.json({
      error: 'A verified Discord identity and target-guild membership are required',
      code: 'discord_membership_required',
    }, 409)
  }
  const evidenceMaxAge = resolveEvidenceMaxAgeMilliseconds(c.env.MEMBERSHIP_EVIDENCE_MAX_AGE_SECONDS)
  if (!isMembershipEvidenceFresh(evidence, new Date(), evidenceMaxAge)) {
    return c.json({
      error: 'Discord membership evidence is stale; verify the target guild again',
      code: 'discord_membership_stale',
    }, 409)
  }

  const body = c.req.valid('json')
  const application = normalizeApplication(body)

  try {
    if (appUser.memberId) {
      const current = await db.transaction((tx) => loadMemberRow(tx, appUser.memberId as string))
      if (!current) {
        return c.json({ error: 'Linked application was not found', code: 'application_not_found' }, 409)
      }
      if (current.memberStatus !== 'rejected') {
        return c.json({
          error: current.memberStatus === 'pending'
            ? 'Application is already pending'
            : current.memberStatus === 'active'
              ? 'Member is already active'
              : 'Withdrawn applications cannot be resubmitted',
          code: current.memberStatus === 'pending'
            ? 'application_pending'
            : current.memberStatus === 'active'
              ? 'already_active'
              : 'application_withdrawn',
          currentVersion: current.applicationVersion,
        }, 409)
      }
      if (body.expectedVersion !== current.applicationVersion) {
        return c.json({
          error: 'Application version conflict',
          code: 'version_conflict',
          currentVersion: current.applicationVersion,
        }, 409)
      }

      const expectedVersion = body.expectedVersion
      const now = new Date().toISOString()
      const updated = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.member_status_reason', 'resubmitted by applicant', true)`)
        const rows = await tx
          .update(members)
          .set({
            ...application,
            memberStatus: 'pending',
            applicationVersion: sql`${members.applicationVersion} + 1`,
            submittedAt: now,
            reviewedAt: null,
            reviewedByUserId: null,
            reviewReason: null,
          })
          .where(and(
            eq(members.memberId, current.memberId),
            eq(members.memberStatus, 'rejected'),
            eq(members.applicationVersion, expectedVersion),
          ))
          .returning({ memberId: members.memberId })
        if (rows.length !== 1) throw new MemberVersionConflictError()
        return loadMemberRow(tx, current.memberId)
      })

      if (!updated) throw new MemberLinkConflictError()
      return c.json(toMemberResponse(updated, evidence), 200)
    }

    const memberId = crypto.randomUUID()
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_member_id', ${memberId}, true)`)
      await tx.insert(members).values({
        ...application,
        memberId,
        memberStatus: 'pending',
        applicationVersion: 1,
      })

      const linkedUsers = await tx
        .update(appAccounts)
        .set({ memberId, updatedAt: new Date().toISOString() })
        .where(and(eq(appAccounts.userId, appUser.id), isNull(appAccounts.memberId)))
        .returning({ id: appAccounts.userId })
      if (linkedUsers.length !== 1) throw new MemberLinkConflictError()

      return loadMemberRow(tx, memberId)
    })

    if (!created) throw new MemberLinkConflictError()
    return c.json(toMemberResponse(created, evidence), 201)
  } catch (error) {
    if (error instanceof MemberVersionConflictError || error instanceof MemberLinkConflictError) {
      return c.json({ error: 'Application version conflict', code: 'version_conflict' }, 409)
    }
    const uniqueConflict = conflictForUniqueMemberField(error)
    if (uniqueConflict) return c.json(uniqueConflict, 409)
    throw error
  }
}

export const getMemberService: RouteHandler<typeof getMemberRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (!appUser.memberId) {
    return c.json({ error: 'No membership application exists', code: 'application_not_found' }, 404)
  }

  const guildId = requireGuildId(c)
  const result = await c.get('db').transaction((tx) => loadResponseForMember(tx, appUser.memberId as string, guildId))
  if (!result) {
    return c.json({ error: 'Membership application was not found', code: 'application_not_found' }, 404)
  }
  return c.json(toMemberResponse(result.row, result.evidence), 200)
}

const applicationIdentityKeys = ['name', 'studentId', 'studentEmail'] as const
const profileKeys = ['displayName', 'skills', 'interests', 'currentActivities', 'bio'] as const

export const updateMemberService: RouteHandler<typeof updateMemberRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (!appUser.memberId) {
    return c.json({ error: 'No membership application exists', code: 'application_not_found' }, 404)
  }

  const db = c.get('db')
  const guildId = requireGuildId(c)
  const current = await db.transaction((tx) => loadMemberRow(tx, appUser.memberId as string))
  if (!current) {
    return c.json({ error: 'Membership application was not found', code: 'application_not_found' }, 404)
  }

  const body = c.req.valid('json')
  if (current.memberStatus === 'withdrawn') {
    return c.json({ error: 'Withdrawn members cannot edit their profile', code: 'member_withdrawn' }, 400)
  }
  if (current.applicationVersion !== body.expectedVersion) {
    return c.json({
      error: 'Application version conflict',
      code: 'version_conflict',
      currentVersion: current.applicationVersion,
    }, 409)
  }

  const editsIdentity = applicationIdentityKeys.some(key => body[key] !== undefined)
  const editsProfile = profileKeys.some(key => body[key] !== undefined)
  if (current.memberStatus === 'active' && editsIdentity) {
    return c.json({
      error: 'Registered name, student ID, and student email are locked after approval',
      code: 'field_not_editable',
    }, 400)
  }
  if (current.memberStatus !== 'active' && editsProfile) {
    return c.json({
      error: 'Public directory fields can only be edited by active members',
      code: 'field_not_editable',
    }, 400)
  }

  const memberChanges: Partial<typeof members.$inferInsert> = {}
  if (body.name !== undefined) memberChanges.name = body.name.trim()
  if (body.grade !== undefined) memberChanges.grade = body.grade
  if (body.emergencyContact !== undefined) memberChanges.emergencyContact = body.emergencyContact.trim()
  if (body.studentId !== undefined) memberChanges.studentId = body.studentId.trim().toUpperCase()
  if (body.studentEmail !== undefined) memberChanges.studentEmail = body.studentEmail.trim().toLowerCase()
  if (body.insurance !== undefined) memberChanges.insurance = body.insurance
  if (body.someAllergy !== undefined) memberChanges.someAllergy = body.someAllergy
  if (body.someAllergy === false) memberChanges.allergyDetails = null
  else if (body.allergyDetails !== undefined) memberChanges.allergyDetails = body.allergyDetails?.trim() || null

  const hasMemberChanges = Object.keys(memberChanges).length > 0
  if (!hasMemberChanges && !editsProfile) {
    return c.json({ error: 'No editable fields were provided', code: 'empty_update' }, 400)
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(members)
        .set({
          ...memberChanges,
          applicationVersion: sql`${members.applicationVersion} + 1`,
        })
        .where(and(
          eq(members.memberId, current.memberId),
          eq(members.memberStatus, current.memberStatus),
          eq(members.applicationVersion, body.expectedVersion),
        ))
        .returning({ memberId: members.memberId })
      if (rows.length !== 1) throw new MemberVersionConflictError()

      if (editsProfile) {
        const currentProfile = current.profileMemberId ? {
          displayName: current.displayName as string,
          skills: current.skills as string[],
          interests: current.interests as string[],
          currentActivities: current.currentActivities as string,
          bio: current.bio as string,
          directoryVisible: current.directoryVisible as boolean,
        } : {
          displayName: current.name,
          skills: [],
          interests: [],
          currentActivities: '',
          bio: '',
          directoryVisible: false,
        }

        const profile = {
          displayName: body.displayName ?? currentProfile.displayName,
          skills: body.skills ?? currentProfile.skills,
          interests: body.interests ?? currentProfile.interests,
          currentActivities: body.currentActivities ?? currentProfile.currentActivities,
          bio: body.bio ?? currentProfile.bio,
          directoryVisible: currentProfile.directoryVisible,
        }
        const profileUpdated = await tx
          .update(memberDirectoryProfiles)
          .set(profile)
          .where(eq(memberDirectoryProfiles.memberId, current.memberId))
          .returning({ memberId: memberDirectoryProfiles.memberId })
        if (profileUpdated.length !== 1) throw new MemberLinkConflictError()
      }

      return loadMemberRow(tx, current.memberId)
    })

    if (!updated) throw new MemberLinkConflictError()
    const evidence = await db.transaction((tx) => readDiscordMembershipEvidence(tx, appUser.id, guildId))
    return c.json(toMemberResponse(updated, evidence), 200)
  } catch (error) {
    if (error instanceof MemberVersionConflictError) {
      const latest = await db.transaction((tx) => loadMemberRow(tx, current.memberId))
      return c.json({
        error: 'Application version conflict',
        code: 'version_conflict',
        currentVersion: latest?.applicationVersion,
      }, 409)
    }
    const uniqueConflict = conflictForUniqueMemberField(error)
    if (uniqueConflict) return c.json(uniqueConflict, 409)
    throw error
  }
}

type DirectoryEntryRow = {
  memberId: string
  displayName: string
  gradeCode: string
  displayGrade: string
  skills: string[]
  interests: string[]
  currentActivities: string
  bio: string
  communities: Array<{ provider: string; communityId: string; nickname: string | null; roles: string[] }> | string
}

export const getDirectoryService: RouteHandler<typeof getDirectoryRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (!appUser.memberId) {
    return c.json({ error: 'Only active members may read the directory', code: 'active_member_required' }, 403)
  }

  const db = c.get('db')
  const [current] = await db.transaction((tx) => tx
    .select({ status: members.memberStatus })
    .from(members)
    .where(eq(members.memberId, appUser.memberId as string))
    .limit(1))
  if (current?.status !== 'active') {
    return c.json({ error: 'Only active members may read the directory', code: 'active_member_required' }, 403)
  }

  // This view is the only general-member read surface. Never replace it with
  // a direct members/profile join: the view owns the PII allowlist.
  const result = await db.transaction((tx) => tx.execute(sql<DirectoryEntryRow>`
    select
      member_id as "memberId",
      display_name as "displayName",
      grade_code as "gradeCode",
      display_grade as "displayGrade",
      skills,
      interests,
      current_activities as "currentActivities",
      bio,
      communities
    from app_api.member_directory_entries
    order by display_name, member_id
  `))
  const rawRows = ((result as unknown as { rows?: DirectoryEntryRow[] }).rows ?? result) as DirectoryEntryRow[]
  return c.json(rawRows.map(row => ({
    ...row,
    communities: typeof row.communities === 'string' ? JSON.parse(row.communities) : row.communities,
  })), 200)
}

export const listAdminMembersService: RouteHandler<typeof listAdminMembersRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (appUser.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'forbidden' }, 403)
  }

  const { status, limit, cursor: cursorValue } = c.req.valid('query')
  const cursor = cursorValue ? decodeCursor(cursorValue) : null
  if (cursorValue && !cursor) {
    return c.json({ error: 'Invalid cursor', code: 'invalid_cursor' }, 400)
  }

  const conditions: SQL[] = []
  if (status) conditions.push(eq(members.memberStatus, status))
  if (cursor) {
    conditions.push(sql`(${members.submittedAt}, ${members.memberId}) < (${cursor.submittedAt}, ${cursor.memberId}::uuid)`)
  }

  const db = c.get('db')
  const guildId = requireGuildId(c)
  // The page and its evidence are read in one transaction: both are pure reads,
  // so a member cannot change status between the two queries.
  const { pageRows, hasNextPage, evidenceByUserId, emailByUserId } = await db.transaction(async (tx) => {
    const rows = await selectMemberRows(
      tx,
      conditions.length ? and(...conditions) : undefined,
      limit + 1,
    )
    const overflows = rows.length > limit
    const page = overflows ? rows.slice(0, limit) : rows
    return {
      pageRows: page,
      hasNextPage: overflows,
      evidenceByUserId: await readDiscordMembershipEvidenceMap(
        tx,
        page.map(row => row.userId),
        guildId,
      ),
      emailByUserId: await readAuthEmails(tx, page.map(row => row.userId)),
    }
  })

  return c.json({
    items: pageRows.map(row => toAdminMemberResponse(
      row,
      evidenceByUserId.get(row.userId) ?? null,
      emailByUserId.get(row.userId) ?? '',
    )),
    nextCursor: hasNextPage && pageRows.length > 0 ? encodeCursor(pageRows[pageRows.length - 1]) : null,
  }, 200)
}

export const getAdminMemberService: RouteHandler<typeof getAdminMemberRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (appUser.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'forbidden' }, 403)
  }

  const db = c.get('db')
  const guildId = requireGuildId(c)
  // One transaction: these are pure reads with no external call between them, so
  // the response is also built from a single consistent snapshot.
  const detail = await db.transaction(async (tx) => {
    const row = await loadMemberRow(tx, c.req.valid('param').id)
    if (!row) return null
    return {
      row,
      evidence: await readDiscordMembershipEvidence(tx, row.userId, guildId),
      email: (await readAuthEmails(tx, [row.userId])).get(row.userId) ?? '',
      history: await tx
        .select({
          fromStatus: memberStatusHistory.fromStatus,
          toStatus: memberStatusHistory.toStatus,
          changedByUserId: memberStatusHistory.changedByUserId,
          reason: memberStatusHistory.reason,
          createdAt: memberStatusHistory.createdAt,
        })
        .from(memberStatusHistory)
        .where(eq(memberStatusHistory.memberId, row.memberId))
        .orderBy(desc(memberStatusHistory.createdAt), desc(memberStatusHistory.historyId)),
    }
  })
  if (!detail) return c.json({ error: 'Member was not found', code: 'member_not_found' }, 404)
  const { row, evidence, history, email } = detail

  return c.json({
    ...toAdminMemberResponse(row, evidence, email),
    statusHistory: history.map(item => ({
      ...item,
      fromStatus: item.fromStatus as MemberStatus | null,
      toStatus: item.toStatus as MemberStatus,
    })),
  }, 200)
}

export type ApproveMemberServiceOptions = {
  now?: () => Date
  fetchImpl?: typeof fetch
}

export const createApproveMemberService = (
  options: ApproveMemberServiceOptions = {},
): RouteHandler<typeof approveMemberRoute, AppContext> => async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (appUser.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'forbidden' }, 403)
  }

  const db = c.get('db')
  const memberId = c.req.valid('param').id
  const { expectedVersion } = c.req.valid('json')
  const current = await db.transaction((tx) => loadMemberRow(tx, memberId))
  if (!current) return c.json({ error: 'Application was not found', code: 'application_not_found' }, 404)
  if (current.memberStatus !== 'pending' || current.applicationVersion !== expectedVersion) {
    return c.json({
      error: 'Application version or status conflict',
      code: 'version_conflict',
      currentVersion: current.applicationVersion,
    }, 409)
  }

  const guildId = requireGuildId(c)
  const discordToken = c.env.DISCORD_TOKEN?.trim()
  if (!discordToken) throw new Error('DISCORD_TOKEN is not configured')
  const now = options.now?.() ?? new Date()
  const maxAge = resolveEvidenceMaxAgeMilliseconds(c.env.MEMBERSHIP_EVIDENCE_MAX_AGE_SECONDS)
  try {
    // Discord I/O and cache synchronization deliberately happen before the
    // approval transaction, so no database row lock is held across the network.
    await refreshDiscordMembershipEvidence({
      db,
      userId: current.userId,
      communityId: guildId,
      token: discordToken,
      now,
      fetchImpl: options.fetchImpl,
    })
  } catch (error) {
    if (error instanceof DiscordIdentityMissingError || error instanceof DiscordMemberNotFoundError) {
      return c.json({
        error: 'Verified target-guild membership is required at approval time',
        code: 'discord_membership_required',
        currentVersion: current.applicationVersion,
      }, 409)
    }
    if (error instanceof DiscordVerificationUpstreamError) {
      return c.json({
        error: 'Discord verification service is unavailable',
        code: 'discord_verification_unavailable',
      }, 502)
    }
    throw error
  }

  const evidence = await db.transaction((tx) => readDiscordMembershipEvidence(tx, current.userId, guildId))
  if (!evidence) {
    return c.json({
      error: 'Verified target-guild membership is required at approval time',
      code: 'discord_membership_required',
      currentVersion: current.applicationVersion,
    }, 409)
  }
  if (!isMembershipEvidenceFresh(evidence, now, maxAge)) {
    return c.json({
      error: 'Discord membership evidence is stale',
      code: 'discord_membership_stale',
      currentVersion: current.applicationVersion,
    }, 409)
  }

  try {
    const displayName = chooseInitialDisplayName(evidence)
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.member_status_reason', 'approved', true)`)
      const updated = await tx
        .update(members)
        .set({
          memberStatus: 'active',
          applicationVersion: sql`${members.applicationVersion} + 1`,
          reviewedAt: now.toISOString(),
          reviewedByUserId: appUser.id,
          reviewReason: null,
        })
        .where(and(
          eq(members.memberId, memberId),
          eq(members.memberStatus, 'pending'),
          eq(members.applicationVersion, expectedVersion),
        ))
        .returning({ memberId: members.memberId })
      if (updated.length !== 1) throw new MemberVersionConflictError()

      const linked = await tx
        .update(appAccounts)
        .set({ memberId, updatedAt: now.toISOString() })
        .where(and(
          eq(appAccounts.userId, current.userId),
          or(isNull(appAccounts.memberId), eq(appAccounts.memberId, memberId)),
        ))
        .returning({ id: appAccounts.userId })
      if (linked.length !== 1) throw new MemberLinkConflictError()

      await tx.insert(memberDirectoryProfiles).values({
        memberId,
        displayName,
        skills: [],
        interests: [],
        currentActivities: '',
        bio: '',
        directoryVisible: true,
      }).onConflictDoUpdate({
        target: memberDirectoryProfiles.memberId,
        set: { displayName, directoryVisible: true },
      })
    })
  } catch (error) {
    if (error instanceof MemberVersionConflictError || error instanceof MemberLinkConflictError) {
      const latest = await db.transaction((tx) => loadMemberRow(tx, memberId))
      return c.json({
        error: 'Application version or linkage conflict',
        code: 'version_conflict',
        currentVersion: latest?.applicationVersion,
      }, 409)
    }
    throw error
  }

  const approved = await db.transaction(async (tx) => {
    const row = await loadMemberRow(tx, memberId)
    if (!row) return null
    return { row, email: (await readAuthEmails(tx, [row.userId])).get(row.userId) ?? '' }
  })
  if (!approved) throw new Error('Approved member could not be reloaded')
  return c.json(toAdminMemberResponse(approved.row, evidence, approved.email), 200)
}

export const approveMemberService = createApproveMemberService()

const adminProfileKeys = [
  'displayName',
  'skills',
  'interests',
  'currentActivities',
  'bio',
  'directoryVisible',
] as const

export const updateAdminMemberService: RouteHandler<typeof updateAdminMemberRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (appUser.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'forbidden' }, 403)
  }

  const db = c.get('db')
  const memberId = c.req.valid('param').id
  const body = c.req.valid('json')
  const current = await db.transaction((tx) => loadMemberRow(tx, memberId))
  if (!current) return c.json({ error: 'Member was not found', code: 'member_not_found' }, 404)
  if (current.applicationVersion !== body.expectedVersion) {
    return c.json({
      error: 'Application version conflict',
      code: 'version_conflict',
      currentVersion: current.applicationVersion,
    }, 409)
  }

  const statusChanges = body.memberStatus !== undefined && body.memberStatus !== current.memberStatus
  if (statusChanges && !(current.memberStatus === 'active' && body.memberStatus === 'withdrawn')) {
    return c.json({
      error: 'Use the approve/reject/resubmit workflow for this status transition',
      code: 'invalid_status_transition',
    }, 400)
  }
  if (statusChanges && !body.reason?.trim()) {
    return c.json({ error: 'A reason is required to withdraw a member', code: 'reason_required' }, 400)
  }

  const editsProfile = adminProfileKeys.some(key => body[key] !== undefined)
  if (editsProfile && (current.memberStatus !== 'active' || statusChanges)) {
    return c.json({
      error: 'Directory profile fields can only be edited while the member remains active',
      code: 'field_not_editable',
    }, 400)
  }

  const memberChanges: Partial<typeof members.$inferInsert> = {}
  if (body.name !== undefined) memberChanges.name = body.name.trim()
  if (body.grade !== undefined) memberChanges.grade = body.grade
  if (body.emergencyContact !== undefined) memberChanges.emergencyContact = body.emergencyContact.trim()
  if (body.studentId !== undefined) memberChanges.studentId = body.studentId.trim().toUpperCase()
  if (body.studentEmail !== undefined) memberChanges.studentEmail = body.studentEmail.trim().toLowerCase()
  if (body.insurance !== undefined) memberChanges.insurance = body.insurance
  if (body.someAllergy !== undefined) memberChanges.someAllergy = body.someAllergy
  if (body.someAllergy === false) memberChanges.allergyDetails = null
  else if (body.allergyDetails !== undefined) memberChanges.allergyDetails = body.allergyDetails?.trim() || null
  if (statusChanges) {
    memberChanges.memberStatus = 'withdrawn'
    memberChanges.reviewedAt = new Date().toISOString()
    memberChanges.reviewedByUserId = appUser.id
    memberChanges.reviewReason = body.reason?.trim()
  }

  if (Object.keys(memberChanges).length === 0 && !editsProfile) {
    return c.json({ error: 'No editable fields were provided', code: 'empty_update' }, 400)
  }

  try {
    await db.transaction(async (tx) => {
      if (statusChanges) {
        await tx.execute(sql`select set_config('app.member_status_reason', ${body.reason?.trim()}, true)`)
      }
      const updated = await tx
        .update(members)
        .set({
          ...memberChanges,
          applicationVersion: sql`${members.applicationVersion} + 1`,
        })
        .where(and(
          eq(members.memberId, memberId),
          eq(members.memberStatus, current.memberStatus),
          eq(members.applicationVersion, body.expectedVersion),
        ))
        .returning({ memberId: members.memberId })
      if (updated.length !== 1) throw new MemberVersionConflictError()

      if (editsProfile) {
        const profileSet: Partial<typeof memberDirectoryProfiles.$inferInsert> = {}
        if (body.displayName !== undefined) profileSet.displayName = body.displayName.trim()
        if (body.skills !== undefined) profileSet.skills = body.skills
        if (body.interests !== undefined) profileSet.interests = body.interests
        if (body.currentActivities !== undefined) profileSet.currentActivities = body.currentActivities
        if (body.bio !== undefined) profileSet.bio = body.bio
        if (body.directoryVisible !== undefined) profileSet.directoryVisible = body.directoryVisible
        const profileUpdated = await tx
          .update(memberDirectoryProfiles)
          .set(profileSet)
          .where(eq(memberDirectoryProfiles.memberId, memberId))
          .returning({ memberId: memberDirectoryProfiles.memberId })
        if (profileUpdated.length !== 1) throw new MemberLinkConflictError()
      }
    })
  } catch (error) {
    if (error instanceof MemberVersionConflictError || error instanceof MemberLinkConflictError) {
      const latest = await db.transaction((tx) => loadMemberRow(tx, memberId))
      return c.json({
        error: 'Application version or profile conflict',
        code: 'version_conflict',
        currentVersion: latest?.applicationVersion,
      }, 409)
    }
    const uniqueConflict = conflictForUniqueMemberField(error)
    if (uniqueConflict) return c.json(uniqueConflict, 409)
    throw error
  }

  const result = await db.transaction(async (tx) => {
    const loaded = await loadResponseForMember(tx, memberId, requireGuildId(c))
    if (!loaded) return null
    return { ...loaded, email: (await readAuthEmails(tx, [loaded.row.userId])).get(loaded.row.userId) ?? '' }
  })
  if (!result) throw new Error('Updated member could not be reloaded')
  return c.json(toAdminMemberResponse(result.row, result.evidence, result.email), 200)
}

export const rejectMemberService: RouteHandler<typeof rejectMemberRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get('appUser')
  if (appUser.role !== 'admin') {
    return c.json({ error: 'Forbidden', code: 'forbidden' }, 403)
  }

  const db = c.get('db')
  const memberId = c.req.valid('param').id
  const { expectedVersion, reason } = c.req.valid('json')
  const current = await db.transaction((tx) => loadMemberRow(tx, memberId))
  if (!current) return c.json({ error: 'Application was not found', code: 'application_not_found' }, 404)
  if (current.memberStatus !== 'pending' || current.applicationVersion !== expectedVersion) {
    return c.json({
      error: 'Application version or status conflict',
      code: 'version_conflict',
      currentVersion: current.applicationVersion,
    }, 409)
  }

  const now = new Date()
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.member_status_reason', ${reason.trim()}, true)`)
      const updated = await tx
        .update(members)
        .set({
          memberStatus: 'rejected',
          applicationVersion: sql`${members.applicationVersion} + 1`,
          reviewedAt: now.toISOString(),
          reviewedByUserId: appUser.id,
          reviewReason: reason.trim(),
        })
        .where(and(
          eq(members.memberId, memberId),
          eq(members.memberStatus, 'pending'),
          eq(members.applicationVersion, expectedVersion),
        ))
        .returning({ memberId: members.memberId })
      if (updated.length !== 1) throw new MemberVersionConflictError()
    })
  } catch (error) {
    if (error instanceof MemberVersionConflictError) {
      const latest = await db.transaction((tx) => loadMemberRow(tx, memberId))
      return c.json({
        error: 'Application version or status conflict',
        code: 'version_conflict',
        currentVersion: latest?.applicationVersion,
      }, 409)
    }
    throw error
  }

  const result = await db.transaction(async (tx) => {
    const loaded = await loadResponseForMember(tx, memberId, requireGuildId(c))
    if (!loaded) return null
    return { ...loaded, email: (await readAuthEmails(tx, [loaded.row.userId])).get(loaded.row.userId) ?? '' }
  })
  if (!result) throw new Error('Rejected member could not be reloaded')
  return c.json(toAdminMemberResponse(result.row, result.evidence, result.email), 200)
}
