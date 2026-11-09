import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

const withProduction = async (run: () => Promise<void>) => {
  const previousEnv = { ...process.env }
  Object.assign(process.env, { NODE_ENV: 'production' })
  try {
    await run()
  } finally {
    process.env = previousEnv
  }
}

const locationOf = async (path: string, cookie?: string) => {
  const request = new NextRequest(`https://app.example.test${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  })
  const response = await middleware(request)
  return response.headers.get('location')
}

test('ログインしていなければ、ログインページへ移動させる', async () => {
  await withProduction(async () => {
    assert.equal(await locationOf('/admin/members'), 'https://app.example.test/login')
    assert.equal(await locationOf('/login'), null)
  })
})

test('ログインしていれば、権限を問い合わせずにページを開かせる', async () => {
  await withProduction(async () => {
    const previousFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error('画面側で権限を問い合わせてはいけない')
    }
    try {
      const cookie = 'app-authorization=existing-session-token'
      for (const path of ['/', '/event', '/admin/members', '/me']) {
        assert.equal(await locationOf(path, cookie), null)
      }
      assert.equal(await locationOf('/login', cookie), 'https://app.example.test/')
    } finally {
      globalThis.fetch = previousFetch
    }
  })
})
