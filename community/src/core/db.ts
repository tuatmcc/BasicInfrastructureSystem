import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'

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

  const db = drizzle(client)
  c.set('db', db)

  try {
    await next()
  } finally {
    c.executionCtx.waitUntil(client.end())
  }
}