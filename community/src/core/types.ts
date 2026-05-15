import { authUser, appUser } from './auth'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CommunityProvider } from '../lib/community/interface'

export type CloudflareBindings = {
  DATABASE_URL: string
  DISCORD_TOKEN: string
  DISCORD_GUILD_ID: string
  SUPABASE_URL: string
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: NodePgDatabase
    community: CommunityProvider
    appUser: appUser
  }
}
