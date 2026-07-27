export const memberStatuses = ['pending', 'active', 'rejected', 'withdrawn'] as const
export type MemberStatus = typeof memberStatuses[number]

export type DirectoryProfile = {
  displayName: string
  skills: string[]
  interests: string[]
  currentActivities: string
  bio: string
  directoryVisible: boolean
}

export type DiscordEvidence = {
  username: string
  providerDisplayName: string | null
  avatarUrl: string | null
  communityId: string
  nickname: string | null
  roles: string[]
  verifiedAt: string
  lastCheckedAt: string
}

export type AdminMember = {
  memberId: string
  name: string
  grade: number
  displayGrade: string
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string | null
  memberStatus: MemberStatus
  applicationVersion: number
  submittedAt: string
  reviewedAt: string | null
  reviewReason: string | null
  createdAt: string
  updatedAt: string
  directoryProfile: DirectoryProfile | null
  discord: DiscordEvidence | null
  userId: string
  userEmail: string
}

export type MemberStatusHistory = {
  fromStatus: MemberStatus | null
  toStatus: MemberStatus
  changedByUserId: string | null
  reason: string | null
  createdAt: string
}

export type AdminMemberDetail = AdminMember & {
  statusHistory: MemberStatusHistory[]
}

export type AdminMemberPage = {
  items: AdminMember[]
  nextCursor: string | null
}

export const memberStatusLabels: Record<MemberStatus, string> = {
  pending: '審査待ち',
  active: '在籍中',
  rejected: '却下',
  withdrawn: '退部',
}

export const memberStatusClasses: Record<MemberStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
  rejected: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
  withdrawn: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

export const formatMemberDate = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

export const normalizeRejectionReason = (reason: string) => {
  const normalized = reason.trim()
  return normalized.length > 0 ? normalized : null
}

type ErrorBody = {
  error?: string
  code?: string
  currentVersion?: number
}

type JsonResponseLike = {
  status: number
  json: () => Promise<unknown>
}

export class MemberApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly currentVersion?: number,
  ) {
    super(message)
    this.name = 'MemberApiError'
  }
}

export const readMemberApiError = async (response: JsonResponseLike, fallback: string) => {
  let body: ErrorBody = {}
  try {
    body = await response.json() as ErrorBody
  } catch {
    // Keep the user-facing fallback when the response has no JSON body.
  }

  return new MemberApiError(
    body.error || `${fallback}: ${response.status}`,
    response.status,
    body.code,
    body.currentVersion,
  )
}

