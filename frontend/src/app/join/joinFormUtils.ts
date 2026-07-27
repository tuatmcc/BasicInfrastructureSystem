export type JoinMemberStatus = 'pending' | 'active' | 'rejected' | 'withdrawn'

export type ExistingJoinApplication = {
  memberId: string
  memberStatus: JoinMemberStatus
  applicationVersion: number
  reviewReason: string | null
  name: string
  grade: number
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string | null
}

export type JoinFormValues = {
  name: string
  grade: string
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string
}

type ApplicationFields = {
  name: string
  grade: number
  emergencyContact: string
  studentId: string
  studentEmail: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string | null
}

export type JoinSubmission =
  | { kind: 'create'; payload: ApplicationFields }
  | { kind: 'update-pending'; payload: ApplicationFields & { expectedVersion: number } }
  | { kind: 'resubmit-rejected'; payload: ApplicationFields & { expectedVersion: number } }

export const createJoinFormValues = (member: ExistingJoinApplication | null): JoinFormValues => ({
  name: member?.name ?? '',
  grade: member ? String(member.grade) : '',
  emergencyContact: member?.emergencyContact ?? '',
  studentId: member?.studentId ?? '',
  studentEmail: member?.studentEmail ?? '',
  insurance: member?.insurance ?? false,
  someAllergy: member?.someAllergy ?? false,
  allergyDetails: member?.allergyDetails ?? '',
})

export const buildJoinSubmission = (
  member: ExistingJoinApplication | null,
  values: JoinFormValues,
): JoinSubmission => {
  if (member?.memberStatus === 'active') {
    throw new Error('承認済みです。会員ページへ移動してください。')
  }
  if (member?.memberStatus === 'withdrawn') {
    throw new Error('取下げ済みの申請です。再開する場合は管理者へ連絡してください。')
  }

  const grade = Number(values.grade)
  if (!Number.isInteger(grade) || grade <= 0) throw new Error('学年を選択してください。')

  const applicationFields: ApplicationFields = {
    name: values.name.trim(),
    grade,
    emergencyContact: values.emergencyContact.trim(),
    studentId: values.studentId.trim(),
    studentEmail: values.studentEmail.trim(),
    insurance: values.insurance,
    someAllergy: values.someAllergy,
    allergyDetails: values.someAllergy ? values.allergyDetails.trim() || null : null,
  }

  if (member?.memberStatus === 'pending') {
    return {
      kind: 'update-pending',
      payload: { ...applicationFields, expectedVersion: member.applicationVersion },
    }
  }
  if (member?.memberStatus === 'rejected') {
    return {
      kind: 'resubmit-rejected',
      payload: { ...applicationFields, expectedVersion: member.applicationVersion },
    }
  }
  return { kind: 'create', payload: applicationFields }
}
