import * as jose from 'jose'
import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import type { AppContext } from './types'
import { users, userRole, roles } from '../../../share/drizzle/schema'

export type authUser = {
  id: string
  email: string
  name: string
}

export type appUser = {
  id: string,
  name: string,
  displayName: string,
  role: 'admin' | 'user'
}

let cachedKeySet: jose.JSONWebKeySet | null = null
let lastFetched: number = 0
const CACHE_TTL = 10 * 60 * 1000

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.split(' ')[1]
  const envUrl = c.env.SUPABASE_URL

  if (!envUrl) {
    console.error('SUPABASE_URL is not set')
    return c.json({ error: 'Internal Server Error' }, 500)
  }

  try {
    const parsedUrl = new URL(envUrl)
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`
    const issuer = `${baseUrl}/auth/v1`

    if (!cachedKeySet || (Date.now() - lastFetched) > CACHE_TTL) {
      const discoveryUrl = `${issuer}/.well-known/openid-configuration`
      
      const discoveryRes = await fetch(discoveryUrl)
      if (!discoveryRes.ok) {
        throw new Error(`Discovery Failed: ${discoveryRes.status}. Check if ${discoveryUrl} is accessible.`)
      }
      
      const discoveryData = await discoveryRes.json() as { jwks_uri: string }
      const jwksUri = discoveryData.jwks_uri
      
      const jwksRes = await fetch(jwksUri)
      if (!jwksRes.ok) {
        throw new Error(`JWKS Fetch Failed: ${jwksRes.status}`)
      }

      cachedKeySet = await jwksRes.json() as jose.JSONWebKeySet
      lastFetched = Date.now()
    }

    const { payload } = await jose.jwtVerify(
      token,
      jose.createLocalJWKSet(cachedKeySet),
      {
        issuer: issuer,
        audience: 'authenticated',
      }
    )

    const authId = payload.sub
    if (!authId) throw new Error('No sub in payload')

    const db = c.get('db')
    const result = await db.select({
      id: users.id,
      displayName: users.displayName,
      roleName: roles.roleName
    })
    .from(users)
    .leftJoin(userRole, eq(users.id, userRole.userId))
    .leftJoin(roles, eq(userRole.roleId, roles.roleId))
    .where(eq(users.authId, authId))
    .limit(1)

    if (result.length === 0) {
      return c.json({ error: 'Unauthorized: User not found' }, 401)
    }

    const dbUser = result[0]

    c.set('appUser', {
      id: dbUser.id,
      name: dbUser.displayName,
      displayName: dbUser.displayName,
      role: (dbUser.roleName as 'admin' | 'user') || 'user'
    })

    await next()
  } catch (error: any) {
    console.error(`[Auth Error] ${error.message}`)
    return c.json({ error: 'Unauthorized: Invalid token' }, 401)
  }
}
