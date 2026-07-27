import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { client } from '@/lib/client'
import JoinPageClient from './JoinPageClient'

// An approved member has nothing to do on this page. The decision depends only
// on data the server can read, so it is made before anything renders: a client
// effect would first paint the application form and then navigate away from it.
export default async function JoinPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('app-authorization')?.value

  let isActiveMember = false
  try {
    const response = await client.api.v0.member.me.$get({}, {
      headers: { Cookie: `app-authorization=${token || ''}` },
    })
    // 404 means no application yet, which is the normal entry point.
    if ((response.status as number) === 200) {
      const member = await response.json()
      isActiveMember = 'memberStatus' in member && member.memberStatus === 'active'
    }
  } catch {
    // The client renders and retries its own failures, so a lookup error here
    // must not replace the page with an error boundary.
  }

  // redirect() signals by throwing, so it stays outside the try above.
  if (isActiveMember) redirect('/me')

  return <JoinPageClient />
}
