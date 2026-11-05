import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

test('management pages use current API permissions and fail closed', async () => {
  const previousFetch = globalThis.fetch
  const previousEnv = { ...process.env }
  Object.assign(process.env, { NODE_ENV: 'production', NEXT_PUBLIC_COMMUNITY_API_URL: 'https://api.example.test' })
  try {
    for (const scenario of [
      { path: '/', permissions: [], destination: '/me' },
      { path: '/event', permissions: ['event.manage'], destination: null },
      { path: '/admin/members', permissions: ['event.manage'], destination: '/me' },
      { path: '/admin/members', permissions: ['member.read_private'], destination: null },
    ]) {
      globalThis.fetch = async (input, options) => {
        assert.equal(String(input), 'https://api.example.test/api/v0/user/me')
        assert.deepEqual(options?.headers, { Authorization: 'Bearer existing-session-token' })
        assert.equal(options?.cache, 'no-store')
        return Response.json({ permissions: scenario.permissions })
      }
      const request = new NextRequest(`https://app.example.test${scenario.path}`, {
        headers: { Cookie: 'app-authorization=existing-session-token' },
      })
      const response = await middleware(request)
      assert.equal(response.headers.get('location'), scenario.destination ? `https://app.example.test${scenario.destination}` : null)
    }
    globalThis.fetch = async () => new Response(null, { status: 401 })
    const response = await middleware(new NextRequest('https://app.example.test/event', {
      headers: { Cookie: 'app-authorization=expired-session-token' },
    }))
    assert.equal(response.headers.get('location'), 'https://app.example.test/login')
  } finally {
    globalThis.fetch = previousFetch
    process.env = previousEnv
  }
})
