
import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { drizzle } from 'drizzle-orm/node-postgres'

export const dbMiddleware = async (c: Context<AppContext>, next: Next) => {
  if (!c.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const db = drizzle(c.env.DATABASE_URL)

  c.set('db', db)

  await next()
}