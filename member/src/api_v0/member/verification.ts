import { and, eq, inArray } from 'drizzle-orm'
import {
  communityIdentities,
  communityMemberships,
} from '../../../../share/drizzle/schema'
import type { AppTransaction, RlsDatabase } from '../../core/db'

export type DiscordMembershipEvidence = {
  identityId: string
  username: string
  providerDisplayName: string | null
  avatarUrl: string | null
  communityId: string
  nickname: string | null
  roles: string[]
  verifiedAt: string
  lastCheckedAt: string
}

export class DiscordIdentityMissingError extends Error {}
export class DiscordMemberNotFoundError extends Error {}
export class DiscordVerificationUpstreamError extends Error {
  constructor(public readonly upstreamStatus: number) {
    super(`Discord verification failed with status ${upstreamStatus}`)
  }
}

type DiscordGuildMember = {
  nick?: string | null
  roles?: string[]
  user?: {
    id?: string
    username?: string
    global_name?: string | null
    avatar?: string | null
  }
}

type DiscordGuildRole = { id?: string; name?: string }

const discordRequest = async (
  fetchImpl: typeof fetch,
  path: string,
  token: string,
) => {
  try {
    return await fetchImpl(`https://discord.com/api/v10${path}`, {
      headers: {
        Authorization: `Bot ${token}`,
        Accept: 'application/json',
      },
    })
  } catch {
    throw new DiscordVerificationUpstreamError(503)
  }
}

export const refreshDiscordMembershipEvidence = async (options: {
  db: RlsDatabase
  userId: string
  communityId: string
  token: string
  now: Date
  fetchImpl?: typeof fetch
}) => {
  const { db, userId, communityId, token, now } = options
  const fetchImpl = options.fetchImpl ?? fetch
  const [identity] = await db.transaction((tx) => tx
    .select({
      identityId: communityIdentities.identityId,
      providerAccountId: communityIdentities.providerAccountId,
    })
    .from(communityIdentities)
    .where(and(
      eq(communityIdentities.userId, userId),
      eq(communityIdentities.provider, 'discord'),
    ))
    .limit(1))

  if (!identity) throw new DiscordIdentityMissingError('Verified Discord OAuth identity is missing')

  const memberResponse = await discordRequest(
    fetchImpl,
    `/guilds/${encodeURIComponent(communityId)}/members/${encodeURIComponent(identity.providerAccountId)}`,
    token,
  )

  if (memberResponse.status === 404) {
    let discordErrorCode: number | null = null
    try {
      const errorBody = await memberResponse.json() as { code?: unknown }
      if (typeof errorBody.code === 'number') discordErrorCode = errorBody.code
    } catch {
      throw new DiscordVerificationUpstreamError(404)
    }
    // 10007 is Discord's Unknown Member code. Other 404s (for example an
    // unknown/inaccessible guild) indicate bot configuration/upstream failure,
    // not proof that this user left the target guild.
    if (discordErrorCode !== 10007) throw new DiscordVerificationUpstreamError(404)

    await db.transaction((tx) => tx
      .insert(communityMemberships)
      .values({
        identityId: identity.identityId,
        communityId,
        membershipStatus: 'not_member',
        nickname: null,
        roleIds: [],
        roleNames: [],
        verifiedAt: null,
        lastCheckedAt: now.toISOString(),
      })
      .onConflictDoUpdate({
        target: [communityMemberships.identityId, communityMemberships.communityId],
        set: {
          membershipStatus: 'not_member',
          nickname: null,
          roleIds: [],
          roleNames: [],
          verifiedAt: null,
          lastCheckedAt: now.toISOString(),
        },
      }))
    throw new DiscordMemberNotFoundError('Discord user is not a member of the target guild')
  }
  if (!memberResponse.ok) throw new DiscordVerificationUpstreamError(memberResponse.status)

  let member: DiscordGuildMember
  try {
    member = await memberResponse.json() as DiscordGuildMember
  } catch {
    throw new DiscordVerificationUpstreamError(502)
  }
  if (
    member.user?.id !== identity.providerAccountId
    || typeof member.user.username !== 'string'
    || !Array.isArray(member.roles)
  ) {
    throw new DiscordVerificationUpstreamError(502)
  }

  const rolesResponse = await discordRequest(
    fetchImpl,
    `/guilds/${encodeURIComponent(communityId)}/roles`,
    token,
  )
  if (!rolesResponse.ok) throw new DiscordVerificationUpstreamError(rolesResponse.status)
  let guildRoles: DiscordGuildRole[]
  try {
    guildRoles = await rolesResponse.json() as DiscordGuildRole[]
  } catch {
    throw new DiscordVerificationUpstreamError(502)
  }
  if (!Array.isArray(guildRoles)) throw new DiscordVerificationUpstreamError(502)

  const roleNameById = new Map(
    guildRoles
      .filter((role): role is { id: string; name: string } => (
        typeof role.id === 'string' && typeof role.name === 'string'
      ))
      .map(role => [role.id, role.name]),
  )
  const roleIds = member.roles
  const roleNames = roleIds
    .map(roleId => roleNameById.get(roleId))
    .filter((roleName): roleName is string => Boolean(roleName))
  const avatarUrl = member.user.avatar
    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
    : null

  await db.transaction(async (tx) => {
    await tx.update(communityIdentities).set({
      username: member.user?.username as string,
      providerDisplayName: member.user?.global_name?.trim() || null,
      avatarUrl,
      lastSyncedAt: now.toISOString(),
    }).where(eq(communityIdentities.identityId, identity.identityId))

    await tx.insert(communityMemberships).values({
      identityId: identity.identityId,
      communityId,
      membershipStatus: 'member',
      nickname: member.nick?.trim() || null,
      roleIds,
      roleNames,
      verifiedAt: now.toISOString(),
      lastCheckedAt: now.toISOString(),
    }).onConflictDoUpdate({
      target: [communityMemberships.identityId, communityMemberships.communityId],
      set: {
        membershipStatus: 'member',
        nickname: member.nick?.trim() || null,
        roleIds,
        roleNames,
        verifiedAt: now.toISOString(),
        lastCheckedAt: now.toISOString(),
      },
    })
  })
}

export const readDiscordMembershipEvidence = async (
  db: AppTransaction,
  userId: string,
  communityId: string,
): Promise<DiscordMembershipEvidence | null> => {
  const [row] = await db
    .select({
      identityId: communityIdentities.identityId,
      username: communityIdentities.username,
      providerDisplayName: communityIdentities.providerDisplayName,
      avatarUrl: communityIdentities.avatarUrl,
      communityId: communityMemberships.communityId,
      nickname: communityMemberships.nickname,
      roles: communityMemberships.roleNames,
      verifiedAt: communityMemberships.verifiedAt,
      lastCheckedAt: communityMemberships.lastCheckedAt,
    })
    .from(communityIdentities)
    .innerJoin(
      communityMemberships,
      eq(communityMemberships.identityId, communityIdentities.identityId),
    )
    .where(and(
      eq(communityIdentities.userId, userId),
      eq(communityIdentities.provider, 'discord'),
      eq(communityMemberships.communityId, communityId),
      eq(communityMemberships.membershipStatus, 'member'),
    ))
    .limit(1)

  if (!row?.verifiedAt) return null

  return {
    ...row,
    verifiedAt: row.verifiedAt,
  }
}

export const readDiscordMembershipEvidenceMap = async (
  db: AppTransaction,
  userIds: string[],
  communityId: string,
) => {
  const evidenceByUserId = new Map<string, DiscordMembershipEvidence>()
  if (userIds.length === 0) return evidenceByUserId

  const rows = await db
    .select({
      userId: communityIdentities.userId,
      identityId: communityIdentities.identityId,
      username: communityIdentities.username,
      providerDisplayName: communityIdentities.providerDisplayName,
      avatarUrl: communityIdentities.avatarUrl,
      communityId: communityMemberships.communityId,
      nickname: communityMemberships.nickname,
      roles: communityMemberships.roleNames,
      verifiedAt: communityMemberships.verifiedAt,
      lastCheckedAt: communityMemberships.lastCheckedAt,
    })
    .from(communityIdentities)
    .innerJoin(
      communityMemberships,
      eq(communityMemberships.identityId, communityIdentities.identityId),
    )
    .where(and(
      inArray(communityIdentities.userId, userIds),
      eq(communityIdentities.provider, 'discord'),
      eq(communityMemberships.communityId, communityId),
      eq(communityMemberships.membershipStatus, 'member'),
    ))

  for (const row of rows) {
    if (!row.verifiedAt || evidenceByUserId.has(row.userId)) continue
    const { userId, ...evidence } = row
    evidenceByUserId.set(userId, {
      ...evidence,
      verifiedAt: row.verifiedAt,
    })
  }

  return evidenceByUserId
}

export const isMembershipEvidenceFresh = (
  evidence: DiscordMembershipEvidence,
  now: Date,
  maxAgeMilliseconds: number,
) => {
  const checkedAt = new Date(evidence.lastCheckedAt).getTime()
  return Number.isFinite(checkedAt)
    && checkedAt <= now.getTime()
    && now.getTime() - checkedAt <= maxAgeMilliseconds
}

export const resolveEvidenceMaxAgeMilliseconds = (value: string | undefined) => {
  const parsedSeconds = Number(value ?? '300')
  if (!Number.isFinite(parsedSeconds) || parsedSeconds <= 0) return 300_000
  return Math.min(parsedSeconds, 86_400) * 1_000
}

export const chooseInitialDisplayName = (evidence: DiscordMembershipEvidence) => {
  const candidates = [
    evidence.nickname,
    evidence.providerDisplayName,
    evidence.username,
  ]

  return candidates
    .map(value => value?.trim())
    .find((value): value is string => Boolean(value)) as string
}
