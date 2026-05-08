import { authUser, appUser } from './auth'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export type CloudflareBindings = {
  DATABASE_URL: string
  SUPABASE_URL: string // 例: https://xxxx.supabase.co
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: NodePgDatabase<any>
    appUser: appUser
  }
}
