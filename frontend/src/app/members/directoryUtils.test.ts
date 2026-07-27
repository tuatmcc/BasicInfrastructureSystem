import assert from 'node:assert/strict'
import test from 'node:test'
import { filterDirectoryEntries, toSafeDirectoryEntry, type DirectoryEntry } from './directoryUtils'

const directoryEntry: DirectoryEntry = {
  memberId: 'c5c9d551-cd34-4c72-a109-39952be15fe8',
  displayName: 'Fox',
  gradeCode: 'B3',
  displayGrade: 'B3',
  skills: ['TypeScript', '車両整備'],
  interests: ['耐久レース'],
  currentActivities: '大会運営',
  bio: 'Webと車両を担当しています。',
  communities: [{
    provider: 'discord',
    communityId: 'guild-1',
    nickname: 'fox-driver',
    roles: ['member', 'developer'],
  }],
}

test('toSafeDirectoryEntry strips private fields even if a response grows them', () => {
  const safe = toSafeDirectoryEntry({
    ...directoryEntry,
    studentId: 'S1234567',
    studentEmail: 'private@example.edu',
    emergencyContact: '090-0000-0000',
    allergyDetails: 'private',
  })

  assert.deepEqual(Object.keys(safe).sort(), [
    'bio',
    'communities',
    'currentActivities',
    'displayGrade',
    'displayName',
    'gradeCode',
    'interests',
    'memberId',
    'skills',
  ])
  assert.equal('studentId' in safe, false)
  assert.equal('studentEmail' in safe, false)
  assert.equal('emergencyContact' in safe, false)
  assert.equal('allergyDetails' in safe, false)
})

test('filterDirectoryEntries searches only allowlisted profile and community fields', () => {
  const entries = [directoryEntry, { ...directoryEntry, memberId: 'member-2', displayName: 'Mika', skills: ['広報'] }]

  assert.deepEqual(filterDirectoryEntries(entries, 'developer').map((entry) => entry.displayName), ['Fox', 'Mika'])
  assert.deepEqual(filterDirectoryEntries(entries, '車両').map((entry) => entry.displayName), ['Fox', 'Mika'])
  assert.deepEqual(filterDirectoryEntries(entries, '広報').map((entry) => entry.displayName), ['Mika'])
  assert.equal(filterDirectoryEntries(entries, '存在しない').length, 0)
})
