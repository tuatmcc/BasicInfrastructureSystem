import assert from 'node:assert/strict'
import test from 'node:test'
import { buildActiveProfileUpdatePayload, parseTags } from './profileFormUtils'

test('parseTags trims, removes duplicates, and drops empty tags', () => {
  assert.deepEqual(parseTags(' TypeScript, Robotics,TypeScript, , Rust '), [
    'TypeScript',
    'Robotics',
    'Rust',
  ])
})

test('active profile payload contains only the self-editable allowlist', () => {
  const payload = buildActiveProfileUpdatePayload(3, {
    grade: '2',
    emergencyContact: ' 090-0000-0000 ',
    insurance: true,
    someAllergy: false,
    allergyDetails: 'must be cleared',
    displayName: ' Taro ',
    skills: 'TypeScript, Rust',
    interests: 'Robotics',
    currentActivities: ' Building a robot ',
    bio: ' Embedded developer ',
  })

  assert.deepEqual(payload, {
    expectedVersion: 3,
    grade: 2,
    emergencyContact: '090-0000-0000',
    insurance: true,
    someAllergy: false,
    allergyDetails: null,
    displayName: 'Taro',
    skills: ['TypeScript', 'Rust'],
    interests: ['Robotics'],
    currentActivities: 'Building a robot',
    bio: 'Embedded developer',
  })
  assert.equal('studentId' in payload, false)
  assert.equal('studentEmail' in payload, false)
  assert.equal('name' in payload, false)
  assert.equal('memberStatus' in payload, false)
  assert.equal('memberId' in payload, false)
})
