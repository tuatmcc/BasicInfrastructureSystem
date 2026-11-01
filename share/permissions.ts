// The permissions the code actually checks.
//
// The database is where permissions live (docs/aidlc/components.md Q-2): a row
// in public.permissions is what makes one exist, and roles reach them through
// role_permissions. This list is not that source of truth — it is the subset the
// application refers to by name, written down so the compiler can reject a
// typo. Without it `can(user, 'member.readPrivate')` would be a string nobody
// holds, and the check would simply never pass.
//
// A migration may add a permission no code checks yet; that is fine. The
// reverse is not, so a test asserts every key here exists in the database.
export const CHECKED_PERMISSIONS = [
  'member.read_public',
  'member.read_private',
  'member.review',
  'member.edit',
  'role.manage',
  'event.manage',
  'reaction.read',
] as const

export type PermissionKey = typeof CHECKED_PERMISSIONS[number]

/**
 * Whether the caller may do this.
 *
 * Ask about the permission, never about the role: a role is a bundle that the
 * club rearranges, and code that asks "is this person an admin" has to be found
 * and rewritten every time a new role appears.
 */
export const can = (
  held: readonly string[] | undefined,
  required: PermissionKey,
) => held?.includes(required) ?? false
