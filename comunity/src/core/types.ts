import { authUser, appUser } from './auth'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export type CloudflareBindings = {
  DATABASE_URL: string
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: NodePgDatabase
    community:any
    appUser: appUser
  }
}