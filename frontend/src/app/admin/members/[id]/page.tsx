import AdminMemberDetail from '../../_components/AdminMemberDetail'

type AdminMemberDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminMemberDetailPage({ params }: AdminMemberDetailPageProps) {
  const { id } = await params
  return <AdminMemberDetail memberId={id} />
}

