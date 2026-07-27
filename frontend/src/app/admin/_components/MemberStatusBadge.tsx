import {
  memberStatusClasses,
  memberStatusLabels,
  type MemberStatus,
} from '../_lib/adminMemberUtils'

export default function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${memberStatusClasses[status]}`}>
      {memberStatusLabels[status]}
    </span>
  )
}

