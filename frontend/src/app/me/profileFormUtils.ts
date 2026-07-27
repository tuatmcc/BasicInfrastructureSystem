export type ActiveProfileFormValues = {
  grade: string
  emergencyContact: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string
  displayName: string
  skills: string
  interests: string
  currentActivities: string
  bio: string
}

export const parseTags = (value: string) => Array.from(new Set(
  value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean),
)).slice(0, 30)

export const buildActiveProfileUpdatePayload = (
  expectedVersion: number,
  values: ActiveProfileFormValues,
) => ({
  expectedVersion,
  grade: Number(values.grade),
  emergencyContact: values.emergencyContact.trim(),
  insurance: values.insurance,
  someAllergy: values.someAllergy,
  allergyDetails: values.someAllergy ? values.allergyDetails.trim() || null : null,
  displayName: values.displayName.trim(),
  skills: parseTags(values.skills),
  interests: parseTags(values.interests),
  currentActivities: values.currentActivities.trim(),
  bio: values.bio.trim(),
})
