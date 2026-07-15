import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { verify } from 'hono/jwt'
import { eq, sql } from 'drizzle-orm'
import { user } from '../../../share/drizzle/schema'

export type authUser = {
  id: string
}

export type appUser = {
  id: string
  discordid: string | null
  name: string
  displayName: string
  memberId: string | null
  role: 'admin' | 'user'
}

const DEFAULT_DEVELOPMENT_USER_ID = 'ZyIJpEjfJSawzQlx84OopP0IMwBtVTQW'

const loadAppUser = async (c: Context<AppContext>, userId: string): Promise<appUser | null> => {
  const [currentUser] = await c.get('db')
    .select({
      id: user.id,
      discordUserId: user.discordUserId,
      name: user.name,
      displayName: user.displayName,
      memberId: user.memberId,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser) {
    return null;
  }

  const role = currentUser.role === 'admin' ? 'admin' : 'user';

  await c.get('db').execute(sql`
    select
      set_config('app.current_user_id', ${currentUser.id}, false),
      set_config('app.current_member_id', ${currentUser.memberId ?? ''}, false),
      set_config('app.current_user_role', ${role}, false)
  `);

  return {
    id: currentUser.id,
    discordid: currentUser.discordUserId,
    name: currentUser.name,
    displayName: currentUser.displayName || currentUser.name,
    memberId: currentUser.memberId,
    role,
  };
}

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  let userId: string;

  if (c.env.NODE_ENV === 'development') {
    // For development purposes, resolve the mock user's latest database state.
    userId = c.env.DEV_USER_ID || DEFAULT_DEVELOPMENT_USER_ID;
    console.warn("[Auth Middleware] Running in development mode. Database-backed mock user has been set.");
  } else {
    console.log("[Auth Middleware] Checking authentication for request:")
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
      if (typeof payload.id !== 'string' || payload.id.length === 0) {
        return c.json({ error: 'Unauthorized: Invalid token subject' }, 401);
      }
      userId = payload.id;
    } catch (error) {
      console.error("[Auth Middleware] Invalid token:", error);
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
  }

  const currentUser = await loadAppUser(c, userId);
  if (!currentUser) {
    return c.json({ error: 'Unauthorized: User not found' }, 401);
  }

  c.set('appUser', currentUser);
  await next();
}
