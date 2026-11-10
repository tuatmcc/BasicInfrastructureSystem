import type { Context } from "hono"
import type { RouteHandler } from "@hono/zod-openapi"
import { and, desc, eq } from "drizzle-orm"
import { can } from "../../../../share/permissions"
import { appRoles, memberRoleHistory, memberRoles, members } from "../../../../share/drizzle/schema"
import type { AppTransaction } from "../../core/db"
import type { AppContext } from "../../core/types"
import { conflictForLastRoleManager } from "../member/service"
import { getMemberRolesRoute, grantRoleRoute, listRolesRoute, revokeRoleRoute } from "./schema"

// ロールの情報は、ブラウザや途中の経路に保存させない
const setPrivateNoStore = (c: Context<AppContext>) => {
  c.header("Cache-Control", "private, no-store, max-age=0")
  c.header("Pragma", "no-cache")
}

const forbidden = { error: "Forbidden", code: "forbidden" }
const memberNotFound = { error: "Member not found", code: "member_not_found" }

// 部員が今持っているロールと、その部員のロールの変更履歴（新しい順）
const loadMemberRoles = async (tx: AppTransaction, memberId: string) => {
  const roles = await tx
    .select({
      roleKey: memberRoles.roleKey,
      displayName: appRoles.displayName,
      grantedAt: memberRoles.grantedAt,
    })
    .from(memberRoles)
    .innerJoin(appRoles, eq(appRoles.roleKey, memberRoles.roleKey))
    .where(eq(memberRoles.memberId, memberId))
    .orderBy(memberRoles.roleKey)

  const history = await tx
    .select({
      roleKey: memberRoleHistory.roleKey,
      action: memberRoleHistory.action,
      actorUserId: memberRoleHistory.actorUserId,
      occurredAt: memberRoleHistory.occurredAt,
    })
    .from(memberRoleHistory)
    .where(eq(memberRoleHistory.memberId, memberId))
    .orderBy(desc(memberRoleHistory.occurredAt), desc(memberRoleHistory.historyId))

  return { roles, history }
}

const findMemberStatus = async (tx: AppTransaction, memberId: string) => {
  const [member] = await tx
    .select({ memberStatus: members.memberStatus })
    .from(members)
    .where(eq(members.memberId, memberId))
    .limit(1)
  return member?.memberStatus
}

export const listRolesService: RouteHandler<typeof listRolesRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get("appUser")
  if (!can(appUser.permissions, "role.manage")) {
    return c.json(forbidden, 403)
  }

  const roles = await c.get("db").transaction((tx) => tx
    .select({
      roleKey: appRoles.roleKey,
      displayName: appRoles.displayName,
      description: appRoles.description,
    })
    .from(appRoles)
    .orderBy(appRoles.roleKey))

  return c.json(roles, 200)
}

export const getMemberRolesService: RouteHandler<typeof getMemberRolesRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get("appUser")
  if (!can(appUser.permissions, "role.manage")) {
    return c.json(forbidden, 403)
  }

  const { memberId } = c.req.valid("param")
  const result = await c.get("db").transaction(async (tx) => {
    if (!await findMemberStatus(tx, memberId)) return null
    return loadMemberRoles(tx, memberId)
  })

  if (!result) {
    return c.json(memberNotFound, 404)
  }
  return c.json(result, 200)
}

export const grantRoleService: RouteHandler<typeof grantRoleRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get("appUser")
  if (!can(appUser.permissions, "role.manage")) {
    return c.json(forbidden, 403)
  }

  const { memberId } = c.req.valid("param")
  const { roleKey } = c.req.valid("json")

  const result = await c.get("db").transaction(async (tx) => {
    const status = await findMemberStatus(tx, memberId)
    if (!status) return "member_not_found" as const

    // 退部するとロールが外れる（U-6）ので、在籍中でない部員には付けない
    if (status !== "active") return "member_not_active" as const

    const [role] = await tx
      .select({ roleKey: appRoles.roleKey })
      .from(appRoles)
      .where(eq(appRoles.roleKey, roleKey))
      .limit(1)
    if (!role) return "unknown_role" as const

    // すでに持っているロールなら何もしない。履歴はトリガーが書く
    await tx
      .insert(memberRoles)
      .values({ memberId, roleKey, grantedByUserId: appUser.id })
      .onConflictDoNothing()

    return loadMemberRoles(tx, memberId)
  })

  if (result === "member_not_found") {
    return c.json(memberNotFound, 404)
  }
  if (result === "member_not_active") {
    return c.json({ error: "Roles can be granted only to active members", code: "member_not_active" }, 409)
  }
  if (result === "unknown_role") {
    return c.json({ error: "Unknown role", code: "unknown_role" }, 400)
  }
  return c.json(result, 200)
}

export const revokeRoleService: RouteHandler<typeof revokeRoleRoute, AppContext> = async (c) => {
  setPrivateNoStore(c)
  const appUser = c.get("appUser")
  if (!can(appUser.permissions, "role.manage")) {
    return c.json(forbidden, 403)
  }

  const { memberId, roleKey } = c.req.valid("param")

  try {
    const result = await c.get("db").transaction(async (tx) => {
      // 最後の管理者を外そうとすると、データベースが拒む（keep_a_role_manager）。履歴はトリガーが書く
      const removed = await tx
        .delete(memberRoles)
        .where(and(eq(memberRoles.memberId, memberId), eq(memberRoles.roleKey, roleKey)))
        .returning({ roleKey: memberRoles.roleKey })
      if (removed.length === 0) return null
      return loadMemberRoles(tx, memberId)
    })

    if (!result) {
      return c.json({ error: "The member does not hold this role", code: "role_not_held" }, 404)
    }
    return c.json(result, 200)
  } catch (error) {
    const lastManager = conflictForLastRoleManager(error)
    if (lastManager) return c.json(lastManager, 409)
    throw error
  }
}
