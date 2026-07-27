import { createRoute, z } from '@hono/zod-openapi'

export const MemberStatusSchema = z
  .enum(['pending', 'active', 'rejected', 'withdrawn'])
  .openapi('MemberStatus')

const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  currentVersion: z.number().int().positive().optional(),
}).openapi('MemberErrorResponse')

const ApplicationFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  grade: z.number().int().positive(),
  emergencyContact: z.string().trim().min(1).max(500),
  studentId: z.string().trim().min(1).max(64),
  studentEmail: z.string().trim().email().max(320),
  insurance: z.boolean().default(false),
  someAllergy: z.boolean().default(false),
  allergyDetails: z.string().max(2000).nullable().optional(),
})

export const JoinMemberSchema = ApplicationFieldsSchema.extend({
  // Required only when the same rejected row is resubmitted. The service
  // returns 409 when the supplied version is stale or omitted.
  expectedVersion: z.number().int().positive().optional(),
}).strict().openapi('JoinMemberRequest')

export const DirectoryProfileSchema = z.object({
  displayName: z.string(),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  currentActivities: z.string(),
  bio: z.string(),
  directoryVisible: z.boolean(),
}).openapi('MemberDirectoryProfile')

export const CommunityMembershipSchema = z.object({
  provider: z.string(),
  communityId: z.string(),
  nickname: z.string().nullable(),
  roles: z.array(z.string()),
}).openapi('DirectoryCommunityMembership')

export const DiscordEvidenceSchema = z.object({
  username: z.string(),
  providerDisplayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  communityId: z.string(),
  nickname: z.string().nullable(),
  roles: z.array(z.string()),
  verifiedAt: z.string(),
  lastCheckedAt: z.string(),
}).openapi('DiscordMembershipEvidence')

export const MemberSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string(),
  grade: z.number().int(),
  displayGrade: z.string(),
  emergencyContact: z.string(),
  studentId: z.string(),
  studentEmail: z.string(),
  insurance: z.boolean(),
  someAllergy: z.boolean(),
  allergyDetails: z.string().nullable(),
  memberStatus: MemberStatusSchema,
  applicationVersion: z.number().int().positive(),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  directoryProfile: DirectoryProfileSchema.nullable(),
  discord: DiscordEvidenceSchema.nullable(),
}).openapi('Member')

export const UpdateMemberSchema = z.object({
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(200).optional(),
  grade: z.number().int().positive().optional(),
  emergencyContact: z.string().trim().min(1).max(500).optional(),
  studentId: z.string().trim().min(1).max(64).optional(),
  studentEmail: z.string().trim().email().max(320).optional(),
  insurance: z.boolean().optional(),
  someAllergy: z.boolean().optional(),
  allergyDetails: z.string().max(2000).nullable().optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  interests: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  currentActivities: z.string().max(2000).optional(),
  bio: z.string().max(2000).optional(),
}).strict().openapi('UpdateMemberRequest')

export const AdminUpdateMemberSchema = z.object({
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(200).optional(),
  grade: z.number().int().positive().optional(),
  emergencyContact: z.string().trim().min(1).max(500).optional(),
  studentId: z.string().trim().min(1).max(64).optional(),
  studentEmail: z.string().trim().email().max(320).optional(),
  insurance: z.boolean().optional(),
  someAllergy: z.boolean().optional(),
  allergyDetails: z.string().max(2000).nullable().optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  interests: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  currentActivities: z.string().max(2000).optional(),
  bio: z.string().max(2000).optional(),
  directoryVisible: z.boolean().optional(),
  memberStatus: MemberStatusSchema.optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
}).strict().openapi('AdminUpdateMemberRequest')

export const DirectoryEntrySchema = z.object({
  memberId: z.string().uuid(),
  displayName: z.string(),
  gradeCode: z.string(),
  displayGrade: z.string(),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  currentActivities: z.string(),
  bio: z.string(),
  communities: z.array(CommunityMembershipSchema),
}).openapi('MemberDirectoryEntry')

export const AdminMemberSchema = MemberSchema.extend({
  userId: z.string(),
  userEmail: z.string().email(),
}).openapi('AdminMember')

export const MemberStatusHistorySchema = z.object({
  fromStatus: MemberStatusSchema.nullable(),
  toStatus: MemberStatusSchema,
  changedByUserId: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
}).openapi('MemberStatusHistory')

export const AdminMemberDetailSchema = AdminMemberSchema.extend({
  statusHistory: z.array(MemberStatusHistorySchema),
}).openapi('AdminMemberDetail')

export const ApplicationDecisionSchema = z.object({
  expectedVersion: z.number().int().positive(),
})

export const RejectApplicationSchema = ApplicationDecisionSchema.extend({
  reason: z.string().trim().min(1).max(2000),
})

export const joinMemberRoute = createRoute({
  method: 'post',
  path: '/join',
  request: {
    body: { content: { 'application/json': { schema: JoinMemberSchema } } },
  },
  responses: {
    200: { description: 'Rejected application resubmitted', content: { 'application/json': { schema: MemberSchema } } },
    201: { description: 'Pending application created', content: { 'application/json': { schema: MemberSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Application conflict or Discord verification required', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const getMemberRoute = createRoute({
  method: 'get',
  path: '/me',
  responses: {
    200: { description: 'Current application/member', content: { 'application/json': { schema: MemberSchema } } },
    404: { description: 'No application', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const updateMemberRoute = createRoute({
  method: 'put',
  path: '/me',
  request: {
    body: { content: { 'application/json': { schema: UpdateMemberSchema } } },
  },
  responses: {
    200: { description: 'Current application/member updated', content: { 'application/json': { schema: MemberSchema } } },
    400: { description: 'Field is not editable in the current state', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'No application', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Version conflict', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const getDirectoryRoute = createRoute({
  method: 'get',
  path: '/directory',
  responses: {
    200: { description: 'Allowlisted active-member directory', content: { 'application/json': { schema: z.array(DirectoryEntrySchema) } } },
    403: { description: 'Only active members may read the directory', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const listAdminMembersRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: z.object({
      status: MemberStatusSchema.optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Private admin member ledger',
      content: {
        'application/json': {
          schema: z.object({ items: z.array(AdminMemberSchema), nextCursor: z.string().nullable() }),
        },
      },
    },
    400: { description: 'Invalid cursor', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const getAdminMemberRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Private admin member detail', content: { 'application/json': { schema: AdminMemberDetailSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const updateAdminMemberRoute = createRoute({
  method: 'put',
  path: '/:id',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: AdminUpdateMemberSchema } } },
  },
  responses: {
    200: { description: 'Admin member update', content: { 'application/json': { schema: AdminMemberSchema } } },
    400: { description: 'Invalid state transition or fields', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Version conflict', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const approveMemberRoute = createRoute({
  method: 'post',
  path: '/:id/approve',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ApplicationDecisionSchema } } },
  },
  responses: {
    200: { description: 'Application approved', content: { 'application/json': { schema: AdminMemberSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Version/status/Discord evidence conflict', content: { 'application/json': { schema: ErrorSchema } } },
    502: { description: 'Discord verification service unavailable', content: { 'application/json': { schema: ErrorSchema } } },
  },
})

export const rejectMemberRoute = createRoute({
  method: 'post',
  path: '/:id/reject',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: RejectApplicationSchema } } },
  },
  responses: {
    200: { description: 'Application rejected', content: { 'application/json': { schema: AdminMemberSchema } } },
    403: { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Version/status conflict', content: { 'application/json': { schema: ErrorSchema } } },
  },
})
