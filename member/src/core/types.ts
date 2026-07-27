import { appUser } from './auth'

import type { RlsDatabase } from './db'

type HyperdriveBinding = { connectionString: string }

export type CloudflareBindings = {
  DATABASE_URL?: string
  JWT_SECRET: string
  FRONTEND_URL: string
  DISCORD_TOKEN: string
  DISCORD_GUILD_ID: string
  MEMBERSHIP_EVIDENCE_MAX_AGE_SECONDS?: string

  NODE_ENV: 'development' | 'production' | null
  DEV_USER_ID?: string
  HYPERDRIVE?: HyperdriveBinding
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: RlsDatabase
    appUser: appUser
  }
}
