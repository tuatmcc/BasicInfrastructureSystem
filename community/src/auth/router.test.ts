import assert from 'node:assert/strict'
import test from 'node:test'
import { withClearedAppAuthorizationCookie } from './router'

test('sign-out response preserves Better Auth cookies and expires the application JWT', async () => {
  const betterAuthResponse = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'app-auth.session_token=; Max-Age=0; Path=/; HttpOnly',
    },
  })

  const response = withClearedAppAuthorizationCookie(betterAuthResponse, {
    isLocal: false,
    domain: 'example.com',
  })
  const setCookie = response.headers.get('set-cookie') ?? ''

  assert.match(setCookie, /app-auth\.session_token=/)
  assert.match(setCookie, /app-authorization=/)
  assert.match(setCookie, /Max-Age=0/)
  assert.match(setCookie, /HttpOnly/)
  assert.match(setCookie, /Secure/)
  assert.match(setCookie, /Domain=example\.com/)
  assert.deepEqual(await response.json(), { success: true })
})
