import { authUser, appUser } from './auth'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export type CloudflareBindings = {
  DATABASE_URL: string
  SUPABASE_URL: string // 例: https://xxxx.supabase.co
  JWT_SECRET: string
  COMMUNITY_URL: string
  FRONTEND_URL: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string

  NODE_ENV: 'development' | 'production' | null
  HYPERDRIVE?: any
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: NodePgDatabase<any>
    appUser: appUser
  }
}
