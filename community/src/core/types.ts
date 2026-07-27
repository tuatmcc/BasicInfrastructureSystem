import { appUser } from './auth'
import type { CommunityProvider } from '../lib/community/interface'
import type { RlsDatabase } from './db'

type HyperdriveBinding = { connectionString: string }

export type CloudflareBindings = {
  DATABASE_URL?: string
  DISCORD_TOKEN: string
  DISCORD_GUILD_ID: string
  FRONTEND_URL: string
  COMMUNITY_URL: string
  BETTER_AUTH_SECRET: string
  JWT_SECRET: string
  COOKIE_DOMAIN: string
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  NODE_ENV: 'development' | 'production' | null
  DEV_USER_ID?: string
  HYPERDRIVE?: HyperdriveBinding
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: RlsDatabase
    community: CommunityProvider
    appUser: appUser
  }
}
