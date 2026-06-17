import { authUser, appUser } from './auth'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CommunityProvider } from '../lib/community/interface'

export type CloudflareBindings = {
  DATABASE_URL: string
  DISCORD_TOKEN: string
  DISCORD_GUILD_ID: string
  SUPABASE_ID: string
  SUPABASE_SECRET_KEY: string
  FRONTEND_URL: string
  COMMUNITY_URL: string
  JWT_SECRET: string
  COOKIE_DOMAIN: string
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
    db: NodePgDatabase
    community: CommunityProvider
    appUser: appUser
  }
}
