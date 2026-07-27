import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAdminMemberUpdatePayload,
  createAdminMemberEditValues,
  splitProfileTags,
  type AdminMemberEditValues,
} from './adminMemberEditUtils'
import type { AdminMemberDetail } from './adminMemberUtils'

const member = (status: AdminMemberDetail['memberStatus']): AdminMemberDetail => ({
  memberId: '11111111-1111-4111-8111-111111111111',
  name: '登録 太郎',
  grade: 2,
  displayGrade: '2年',
  emergencyContact: '090-0000-0000',
  studentId: 'S1234567',
  studentEmail: 'student@example.ac.jp',
  insurance: true,
  someAllergy: false,
  allergyDetails: null,
  memberStatus: status,
  applicationVersion: 3,
  submittedAt: '2026-07-16T00:00:00.000Z',
  reviewedAt: null,
  reviewReason: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  directoryProfile: {
    displayName: 'Taro',
    skills: ['TypeScript'],
    interests: ['Robotics'],
    currentActivities: '開発',
    bio: '自己紹介',
    directoryVisible: true,
  },
  discord: null,
  userId: 'user-1',
  userEmail: 'auth@example.com',
  statusHistory: [],
})

test('active-member update includes identity and directory fields but never role', () => {
  const target = member('active')
  const values = createAdminMemberEditValues(target)
  const payload = buildAdminMemberUpdatePayload(target, {
    ...values,
    name: '  登録 花子  ',
    studentId: ' s7654321 ',
    skills: 'TypeScript\nTypeScript, React',
  })

  assert.equal(payload.expectedVersion, 3)
  assert.equal(payload.name, '登録 花子')
  assert.equal(payload.studentId, 's7654321')
  assert.deepEqual(payload.skills, ['TypeScript', 'React'])
  assert.equal(payload.directoryVisible, true)
  assert.equal('role' in payload, false)
})

test('non-active-member update excludes directory fields rejected by the API', () => {
  const target = member('pending')
  const values = createAdminMemberEditValues(target)
  const payload = buildAdminMemberUpdatePayload(target, values)

  assert.equal('displayName' in payload, false)
  assert.equal('directoryVisible' in payload, false)
  assert.equal('memberStatus' in payload, false)
})

test('withdrawal includes reason and excludes simultaneous directory edits', () => {
  const target = member('active')
  const values: AdminMemberEditValues = {
    ...createAdminMemberEditValues(target),
    withdrawMember: true,
    reason: '  本人から退部の申し出  ',
  }
  const payload = buildAdminMemberUpdatePayload(target, values)

  assert.equal(payload.memberStatus, 'withdrawn')
  assert.equal(payload.reason, '本人から退部の申し出')
  assert.equal('displayName' in payload, false)
})

test('splitProfileTags removes blanks and duplicates', () => {
  assert.deepEqual(splitProfileTags(' React, TypeScript\nReact\n '), ['React', 'TypeScript'])
})
