import { authUser, appUser } from './auth'

export type CloudflareBindings = {
  DATABASE_URL: string
}

export type AppContext = {
  Bindings: CloudflareBindings
  Variables: {
    db: unknown // todo: dbclient
    appUser: appUser
  }
}