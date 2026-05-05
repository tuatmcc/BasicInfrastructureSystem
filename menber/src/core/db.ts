
import type { Context, Next } from 'hono'
import { AppContext } from './types'

export const dbMiddleware = async (c: Context<AppContext>, next: Next) => {
  if (!c.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  c.set('db', null)// todo: dbclient

  await next()
}