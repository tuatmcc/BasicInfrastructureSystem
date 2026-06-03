import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { verify } from 'hono/jwt'

export type authUser = {
  id: string
}

export type appUser = {
  id: string
  discordid: string | null
  name: string
  displayName: string
  role: 'admin' | 'user'
}

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  // Authorizationヘッダーか、Cookie 'app-authorization' からJWTを取得
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const { getCookie } = await import('hono/cookie');
    token = getCookie(c, 'app-authorization');
  }

  if (!token) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');

    // Better Auth user properties mapping
    c.set('appUser', {
      id: payload.id as string,
      discordid: (payload.discordid as string | null) || null,
      name: payload.name as string,
      displayName: (payload.displayName as string) || (payload.name as string),
      role: (payload.role as 'admin' | 'user') || 'user'
    });

    await next();
  } catch (error) {
    console.error("[Auth Middleware] Invalid token:", error);
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
}
