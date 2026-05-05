import { authUser, appUser } from './auth'

export type CloudflareBindings = {
  SUPABASE_URL: string
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: unknown // todo: dbclient
    appUser: appUser
  }
}