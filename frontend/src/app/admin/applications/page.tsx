import AdminMemberList from '../_components/AdminMemberList'

export default function AdminApplicationsPage() {
  return (
    <AdminMemberList
      fixedStatus="pending"
      eyebrow="Pending applications"
      title="入部申請"
      description="審査待ちの申請だけを表示します。詳細画面でDiscord本人確認と登録情報を照合して判断してください。"
    />
  )
}

