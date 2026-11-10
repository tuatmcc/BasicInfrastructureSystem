import assert from 'node:assert/strict'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { CHECKED_PERMISSIONS } from '../../../../share/permissions'
import type { appUser } from '../../core/auth'
import { createRlsDatabase } from '../../core/db'
import {
  applyAsNewUser,
  approveMember,
  promoteToAdmin,
  replayThroughLatest,
  replayThroughSplit,
} from '../../core/testing/migrations'
import { getMemberRolesService, grantRoleService, listRolesService, revokeRoleService } from './service'

type JsonResponse = { body: any; status: number }

const firstAdminMember = '00000000-0000-4000-8000-000000000901'
const secondMember = '00000000-0000-4000-8000-000000000902'
const pendingMember = '00000000-0000-4000-8000-000000000903'

const firstAdmin: appUser = { id: 'role-first', name: 'First', memberId: firstAdminMember, permissions: [...CHECKED_PERMISSIONS] }
const second: appUser = { id: 'role-second', name: 'Second', memberId: secondMember, permissions: [...CHECKED_PERMISSIONS] }
const plainMember: appUser = { id: 'role-second', name: 'Second', memberId: secondMember, permissions: ['member.read_public'] }

// 本物の RLS 付きのデータベースで、API の処理を 1 回呼ぶ
const call = async (
  client: PGlite,
  service: (c: never) => unknown,
  currentUser: appUser,
  request: { params?: Record<string, string>; body?: unknown } = {},
): Promise<JsonResponse> => {
  const db = createRlsDatabase(drizzle(client) as never)
  db.setIdentity({ userId: currentUser.id })
  const context = {
    req: {
      valid: (target: string) => target === 'json' ? request.body : request.params ?? {},
    },
    get: (key: string) => {
      if (key === 'appUser') return currentUser
      if (key === 'db') return db
      throw new Error(`Unexpected context key: ${key}`)
    },
    header: () => {},
    json: (body: unknown, status: number): JsonResponse => ({ body, status }),
  }
  return await service(context as never) as JsonResponse
}

const setUp = async () => {
  const client = await PGlite.create()
  await replayThroughSplit(client)
  await applyAsNewUser(client, { userId: firstAdmin.id, memberId: firstAdminMember })
  await promoteToAdmin(client, firstAdmin.id)
  await approveMember(client, firstAdmin.id, firstAdminMember)
  await applyAsNewUser(client, { userId: second.id, memberId: secondMember })
  await approveMember(client, firstAdmin.id, secondMember)
  await applyAsNewUser(client, { userId: 'role-pending', memberId: pendingMember })
  await replayThroughLatest(client)
  return client
}

test('role.manage を持たない人は、ロールの API を使えない', async () => {
  const client = await setUp()
  try {
    const params = { memberId: secondMember }
    assert.equal((await call(client, listRolesService as never, plainMember)).status, 403)
    assert.equal((await call(client, getMemberRolesService as never, plainMember, { params })).status, 403)
    assert.equal((await call(client, grantRoleService as never, plainMember, { params, body: { roleKey: 'admin' } })).status, 403)
    assert.equal((await call(client, revokeRoleService as never, plainMember, { params: { ...params, roleKey: 'member' } })).status, 403)
  } finally {
    await client.close()
  }
})

test('ロールを付けて外すと、結果と履歴が返る', async () => {
  const client = await setUp()
  try {
    const roles = await call(client, listRolesService as never, firstAdmin)
    assert.equal(roles.status, 200)
    assert.deepEqual(roles.body.map((role: { roleKey: string }) => role.roleKey), ['admin', 'member'])

    // 2 人目に admin を付ける。同じロールを 2 回付けても、2 回目は何もしない
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const granted = await call(client, grantRoleService as never, firstAdmin, {
        params: { memberId: secondMember },
        body: { roleKey: 'admin' },
      })
      assert.equal(granted.status, 200)
      assert.deepEqual(granted.body.roles.map((role: { roleKey: string }) => role.roleKey), ['admin', 'member'])
      assert.deepEqual(
        granted.body.history.map((row: { roleKey: string; action: string; actorUserId: string }) =>
          [row.roleKey, row.action, row.actorUserId]),
        [['admin', 'grant', firstAdmin.id]],
        '付与は 1 回だけ、付けた人と一緒に履歴に残る',
      )
    }

    // 2 人目が、1 人目の admin を外す（管理者がまだ 1 人残るので許される）
    const revoked = await call(client, revokeRoleService as never, second, {
      params: { memberId: firstAdminMember, roleKey: 'admin' },
    })
    assert.equal(revoked.status, 200)
    assert.deepEqual(revoked.body.roles.map((role: { roleKey: string }) => role.roleKey), ['member'])
    assert.deepEqual(
      [revoked.body.history[0].roleKey, revoked.body.history[0].action, revoked.body.history[0].actorUserId],
      ['admin', 'revoke', second.id],
    )

    // 最後の管理者は外せない
    const lastManager = await call(client, revokeRoleService as never, second, {
      params: { memberId: secondMember, roleKey: 'admin' },
    })
    assert.equal(lastManager.status, 409)
    assert.equal(lastManager.body.code, 'last_role_manager')

    // 部員のロールと履歴を読む
    const current = await call(client, getMemberRolesService as never, second, { params: { memberId: secondMember } })
    assert.equal(current.status, 200)
    assert.deepEqual(current.body.roles.map((role: { roleKey: string }) => role.roleKey), ['admin', 'member'])
  } finally {
    await client.close()
  }
})

test('付けられない相手や存在しないロールは、理由つきで断る', async () => {
  const client = await setUp()
  try {
    const grant = (memberId: string, roleKey: string) =>
      call(client, grantRoleService as never, firstAdmin, { params: { memberId }, body: { roleKey } })

    const pending = await grant(pendingMember, 'admin')
    assert.equal(pending.status, 409)
    assert.equal(pending.body.code, 'member_not_active', '在籍中でない部員には付けない')

    const unknownRole = await grant(secondMember, 'treasurer')
    assert.equal(unknownRole.status, 400)
    assert.equal(unknownRole.body.code, 'unknown_role')

    const unknownMember = await grant('00000000-0000-4000-8000-000000000999', 'admin')
    assert.equal(unknownMember.status, 404)
    assert.equal(unknownMember.body.code, 'member_not_found')

    const notHeld = await call(client, revokeRoleService as never, firstAdmin, {
      params: { memberId: pendingMember, roleKey: 'admin' },
    })
    assert.equal(notHeld.status, 404)
    assert.equal(notHeld.body.code, 'role_not_held')
  } finally {
    await client.close()
  }
})
