import type { AdminMemberDetail } from './adminMemberUtils'

export type AdminMemberEditValues = {
  name: string
  grade: number
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string
  displayName: string
  skills: string
  interests: string
  currentActivities: string
  bio: string
  directoryVisible: boolean
  withdrawMember: boolean
  reason: string
}

export type AdminMemberUpdatePayload = {
  expectedVersion: number
  name: string
  grade: number
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string | null
  displayName?: string
  skills?: string[]
  interests?: string[]
  currentActivities?: string
  bio?: string
  directoryVisible?: boolean
  memberStatus?: 'withdrawn'
  reason?: string
}

export const splitProfileTags = (value: string) => Array.from(new Set(
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean),
))

export const createAdminMemberEditValues = (member: AdminMemberDetail): AdminMemberEditValues => ({
  name: member.name,
  grade: member.grade,
  emergencyContact: member.emergencyContact,
  studentId: member.studentId,
  studentEmail: member.studentEmail,
  insurance: member.insurance,
  someAllergy: member.someAllergy,
  allergyDetails: member.allergyDetails || '',
  displayName: member.directoryProfile?.displayName || member.name,
  skills: member.directoryProfile?.skills.join('\n') || '',
  interests: member.directoryProfile?.interests.join('\n') || '',
  currentActivities: member.directoryProfile?.currentActivities || '',
  bio: member.directoryProfile?.bio || '',
  directoryVisible: member.directoryProfile?.directoryVisible || false,
  withdrawMember: false,
  reason: '',
})

export const buildAdminMemberUpdatePayload = (
  member: AdminMemberDetail,
  values: AdminMemberEditValues,
): AdminMemberUpdatePayload => {
  const payload: AdminMemberUpdatePayload = {
    expectedVersion: member.applicationVersion,
    name: values.name.trim(),
    grade: values.grade,
    emergencyContact: values.emergencyContact.trim(),
    studentId: values.studentId.trim(),
    studentEmail: values.studentEmail.trim(),
    insurance: values.insurance,
    someAllergy: values.someAllergy,
    allergyDetails: values.someAllergy ? values.allergyDetails.trim() || null : null,
  }

  if (member.memberStatus === 'active' && !values.withdrawMember) {
    payload.displayName = values.displayName.trim()
    payload.skills = splitProfileTags(values.skills)
    payload.interests = splitProfileTags(values.interests)
    payload.currentActivities = values.currentActivities
    payload.bio = values.bio
    payload.directoryVisible = values.directoryVisible
  }

  if (member.memberStatus === 'active' && values.withdrawMember) {
    payload.memberStatus = 'withdrawn'
    payload.reason = values.reason.trim()
  }

  return payload
}
