import { eq } from 'drizzle-orm'
import { appAccounts, memberRoles, rolePermissions } from '../../../share/drizzle/schema'
import type { AppDatabase, AppTransaction } from './db'

// ユーザー ID から、その人が持っている権限の一覧を求める。
// たどり方：ユーザー → 部員（app_accounts）→ ロール（member_roles）→ 権限（role_permissions）
// 2 つのロールが同じ権限を持っていても、一覧には 1 回だけ入る。
//
// RLS が使うデータベース関数 app_private.permissions_for も、同じたどり方をしている。
// 片方だけ変えると API と RLS の答えが食い違うので、一致することをテストで確かめている
// （member/src/core/migration.integration.test.ts）。
export const findPermissions = async (
  db: AppDatabase | AppTransaction,
  userId: string,
): Promise<string[]> => {
  const rows = await db
    .selectDistinct({ permissionKey: rolePermissions.permissionKey })
    .from(appAccounts)
    .innerJoin(memberRoles, eq(memberRoles.memberId, appAccounts.memberId))
    .innerJoin(rolePermissions, eq(rolePermissions.roleKey, memberRoles.roleKey))
    .where(eq(appAccounts.userId, userId))

  return rows.map((row) => row.permissionKey)
}
