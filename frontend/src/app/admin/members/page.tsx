import AdminMemberList from '../_components/AdminMemberList'

export default function AdminMembersPage() {
  return (
    <AdminMemberList
      eyebrow="Admin members"
      title="管理者用 部員台帳"
      description="申請中・在籍中・却下・退部を含む全部員を、登録情報そのままで確認します。"
    />
  )
}

