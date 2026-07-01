import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'

const resetRlsSession = async (client: Client) => {
  await client.query('reset role')
  await client.query('reset all')
  await client.query('set role app_rls')
  await client.query(`
    select
      set_config('app.current_user_id', '', false),
      set_config('app.current_member_id', '', false),
      set_config('app.current_user_role', '', false)
  `)
}

export const dbMiddleware = async (c: Context<AppContext>, next: Next) => {
  const connectionString = c.env.HYPERDRIVE?.connectionString || c.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('Database connection string (DATABASE_URL or HYPERDRIVE) is not set')
  }

  const client = new Client({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })
  await client.connect()
  await resetRlsSession(client)

  const db = drizzle(client)
  c.set('db', db)

  try {
    await next()
  } finally {
    try {
      await resetRlsSession(client)
    } catch (error) {
      console.error('[DB Middleware] Failed to reset RLS settings:', error)
    }
    try {
      await client.query('reset role')
      await client.query('reset all')
    } catch (error) {
      console.error('[DB Middleware] Failed to reset database role:', error)
    }
    c.executionCtx.waitUntil(client.end())
  }
}
