import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MemberApiError,
  formatMemberDate,
  memberStatusLabels,
  normalizeRejectionReason,
  readMemberApiError,
} from './adminMemberUtils'

test('normalizeRejectionReason requires non-whitespace content', () => {
  assert.equal(normalizeRejectionReason('  Discord連携を確認できません  '), 'Discord連携を確認できません')
  assert.equal(normalizeRejectionReason('   '), null)
})

test('status labels and dates are deterministic for admin views', () => {
  assert.equal(memberStatusLabels.pending, '審査待ち')
  assert.equal(memberStatusLabels.active, '在籍中')
  assert.match(formatMemberDate('2026-07-16T00:00:00.000Z'), /2026/)
  assert.equal(formatMemberDate(null), '—')
})

test('readMemberApiError preserves concurrency metadata', async () => {
  const error = await readMemberApiError({
    status: 409,
    json: async () => ({ error: '更新競合', code: 'VERSION_CONFLICT', currentVersion: 4 }),
  }, '更新に失敗しました')

  assert.ok(error instanceof MemberApiError)
  assert.equal(error.status, 409)
  assert.equal(error.code, 'VERSION_CONFLICT')
  assert.equal(error.currentVersion, 4)
})

