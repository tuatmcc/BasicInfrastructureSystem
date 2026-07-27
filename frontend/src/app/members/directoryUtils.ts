export type DirectoryCommunity = {
  provider: string
  communityId: string
  nickname: string | null
  roles: string[]
}

export type DirectoryEntry = {
  memberId: string
  displayName: string
  gradeCode: string
  displayGrade: string
  skills: string[]
  interests: string[]
  currentActivities: string
  bio: string
  communities: DirectoryCommunity[]
}

// Rebuild every entry from an explicit allowlist. If the backend response grows
// private fields later, this page will not accidentally retain or render them.
export const toSafeDirectoryEntry = (
  entry: DirectoryEntry & Record<string, unknown>,
): DirectoryEntry => ({
  memberId: entry.memberId,
  displayName: entry.displayName,
  gradeCode: entry.gradeCode,
  displayGrade: entry.displayGrade,
  skills: [...entry.skills],
  interests: [...entry.interests],
  currentActivities: entry.currentActivities,
  bio: entry.bio,
  communities: entry.communities.map((community) => ({
    provider: community.provider,
    communityId: community.communityId,
    nickname: community.nickname,
    roles: [...community.roles],
  })),
})

const searchableText = (entry: DirectoryEntry) => [
  entry.displayName,
  entry.gradeCode,
  entry.displayGrade,
  entry.currentActivities,
  entry.bio,
  ...entry.skills,
  ...entry.interests,
  ...entry.communities.flatMap((community) => [
    community.provider,
    community.nickname ?? '',
    ...community.roles,
  ]),
].join('\n').toLocaleLowerCase('ja-JP')

export const filterDirectoryEntries = (entries: DirectoryEntry[], query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase('ja-JP')
  if (!normalizedQuery) return entries

  return entries.filter((entry) => searchableText(entry).includes(normalizedQuery))
}

