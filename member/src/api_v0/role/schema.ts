import { createRoute, z } from "@hono/zod-openapi"

// ロールの付与・剥奪（U-5、FR-5.1）。どの API も role.manage を持つ人だけが使える。

const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
}).openapi("RoleErrorResponse")

// 選べるロール
export const RoleSchema = z.object({
  roleKey: z.string(),
  displayName: z.string(),
  description: z.string(),
}).openapi("Role")

// 部員が今持っているロール
export const MemberRoleSchema = z.object({
  roleKey: z.string(),
  displayName: z.string(),
  grantedAt: z.string(),
}).openapi("MemberRole")

// ロールの変更履歴（FR-5.3）
export const RoleHistorySchema = z.object({
  roleKey: z.string(),
  action: z.enum(["grant", "revoke"]),
  actorUserId: z.string(),
  occurredAt: z.string(),
}).openapi("RoleHistory")

export const MemberRolesResponseSchema = z.object({
  roles: z.array(MemberRoleSchema),
  history: z.array(RoleHistorySchema),
}).openapi("MemberRolesResponse")

const MemberParamsSchema = z.object({
  memberId: z.string().uuid().openapi({ param: { name: "memberId", in: "path" } }),
})

const MemberRoleParamsSchema = MemberParamsSchema.extend({
  roleKey: z.string().openapi({ param: { name: "roleKey", in: "path" } }),
})

export const GrantRoleSchema = z.object({
  roleKey: z.string(),
}).openapi("GrantRole")

export const listRolesRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: { description: "選べるロールの一覧", content: { "application/json": { schema: z.array(RoleSchema) } } },
    403: { description: "権限がありません", content: { "application/json": { schema: ErrorSchema } } },
  },
})

export const getMemberRolesRoute = createRoute({
  method: "get",
  path: "/members/{memberId}",
  request: { params: MemberParamsSchema },
  responses: {
    200: { description: "部員のロールと変更履歴", content: { "application/json": { schema: MemberRolesResponseSchema } } },
    403: { description: "権限がありません", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "部員が見つかりません", content: { "application/json": { schema: ErrorSchema } } },
  },
})

export const grantRoleRoute = createRoute({
  method: "post",
  path: "/members/{memberId}",
  request: {
    params: MemberParamsSchema,
    body: { content: { "application/json": { schema: GrantRoleSchema } } },
  },
  responses: {
    200: { description: "付与した後のロールと変更履歴", content: { "application/json": { schema: MemberRolesResponseSchema } } },
    400: { description: "存在しないロール", content: { "application/json": { schema: ErrorSchema } } },
    403: { description: "権限がありません", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "部員が見つかりません", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "在籍中でない部員にはロールを付けられません", content: { "application/json": { schema: ErrorSchema } } },
  },
})

export const revokeRoleRoute = createRoute({
  method: "delete",
  path: "/members/{memberId}/{roleKey}",
  request: { params: MemberRoleParamsSchema },
  responses: {
    200: { description: "外した後のロールと変更履歴", content: { "application/json": { schema: MemberRolesResponseSchema } } },
    403: { description: "権限がありません", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "部員がそのロールを持っていません", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "最後の管理者は外せません", content: { "application/json": { schema: ErrorSchema } } },
  },
})
