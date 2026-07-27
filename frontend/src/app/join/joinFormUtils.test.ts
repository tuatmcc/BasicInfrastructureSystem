import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildJoinSubmission,
  createJoinFormValues,
  type ExistingJoinApplication,
  type JoinFormValues,
} from './joinFormUtils'

const values: JoinFormValues = {
  name: ' 入部 太郎 ',
  grade: '2',
  emergencyContact: ' 090-0000-0000 ',
  studentId: ' S1234567 ',
  studentEmail: ' student@example.ac.jp ',
  insurance: true,
  someAllergy: false,
  allergyDetails: '送信してはいけない値',
}

const application = (memberStatus: ExistingJoinApplication['memberStatus']): ExistingJoinApplication => ({
  memberId: '11111111-1111-4111-8111-111111111111',
  memberStatus,
  applicationVersion: 4,
  reviewReason: memberStatus === 'rejected' ? '確認事項あり' : null,
  name: '入部 太郎',
  grade: 2,
  emergencyContact: '090-0000-0000',
  studentId: 'S1234567',
  studentEmail: 'student@example.ac.jp',
  insurance: true,
  someAllergy: false,
  allergyDetails: null,
})

test('new application payload omits expectedVersion', () => {
  const submission = buildJoinSubmission(null, values)
  assert.equal(submission.kind, 'create')
  assert.equal('expectedVersion' in submission.payload, false)
  assert.equal(submission.payload.name, '入部 太郎')
  assert.equal(submission.payload.allergyDetails, null)
})

test('pending application is updated in place with optimistic-lock version', () => {
  const submission = buildJoinSubmission(application('pending'), values)
  assert.equal(submission.kind, 'update-pending')
  assert.equal(submission.payload.expectedVersion, 4)
})

test('rejected application resubmits the same row with its version', () => {
  const submission = buildJoinSubmission(application('rejected'), {
    ...values,
    someAllergy: true,
    allergyDetails: '  そば  ',
  })
  assert.equal(submission.kind, 'resubmit-rejected')
  assert.equal(submission.payload.expectedVersion, 4)
  assert.equal(submission.payload.allergyDetails, 'そば')
})

test('withdrawn and active records cannot produce a join payload', () => {
  assert.throws(() => buildJoinSubmission(application('withdrawn'), values), /管理者へ連絡/)
  assert.throws(() => buildJoinSubmission(application('active'), values), /会員ページ/)
})

test('existing values initialize a keyed form without an effect', () => {
  const initial = createJoinFormValues(application('rejected'))
  assert.equal(initial.grade, '2')
  assert.equal(initial.studentId, 'S1234567')
})

test('zero or blank grade is rejected before the API request', () => {
  assert.throws(() => buildJoinSubmission(null, { ...values, grade: '' }), /学年/)
  assert.throws(() => buildJoinSubmission(null, { ...values, grade: '0' }), /学年/)
})
