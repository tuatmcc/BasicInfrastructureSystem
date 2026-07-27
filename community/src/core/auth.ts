import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { verify } from 'hono/jwt'
import { and, eq, gt } from 'drizzle-orm'
import { session, user } from '../../../share/drizzle/schema'

export type authUser = {
  id: string
}

export type appUser = {
  id: string
  name: string
  memberId: string | null
  role: 'admin' | 'user'
}

const userSelection = {
  id: user.id,
  name: user.name,
  memberId: user.memberId,
  role: user.role,
}

const loadAppUser = async (
  c: Context<AppContext>,
  userId: string,
  sessionId?: string,
): Promise<appUser | null> => {
  const [currentUser] = await c.get('db').transaction(async (db) => sessionId
    ? db
      .select(userSelection)
      .from(user)
      .innerJoin(session, eq(session.userId, user.id))
      .where(and(
        eq(user.id, userId),
        eq(session.id, sessionId),
        gt(session.expiresAt, new Date()),
      ))
      .limit(1)
    : db
      .select(userSelection)
      .from(user)
      .where(eq(user.id, userId))
      .limit(1));

  if (!currentUser) {
    return null;
  }

  const role = currentUser.role === 'admin' ? 'admin' : 'user';
  c.get('db').setIdentity({
    userId: currentUser.id,
    memberId: currentUser.memberId,
    role,
  });

  return {
    id: currentUser.id,
    name: currentUser.name,
    memberId: currentUser.memberId,
    role,
  };
}

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  let userId: string;
  let sessionId: string | undefined;

  if (c.env.NODE_ENV === 'development') {
    const developmentUserId = c.env.DEV_USER_ID?.trim();
    if (!developmentUserId) {
      return c.json({ error: 'Development authentication requires DEV_USER_ID' }, 500);
    }
    userId = developmentUserId;
    console.warn("[Auth Middleware] Running in development mode. Database-backed mock user has been set.");
  } else {
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
      if (typeof payload.sid !== 'string' || payload.sid.length === 0) {
        return c.json({ error: 'Unauthorized: Session binding is missing' }, 401);
      }
      userId = payload.id;
      sessionId = payload.sid;
    } catch (error) {
      console.error("[Auth Middleware] Invalid token:", error);
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
  }

  const currentUser = await loadAppUser(c, userId, sessionId);
  if (!currentUser) {
    return c.json({ error: 'Unauthorized: User not found' }, 401);
  }

  c.set('appUser', currentUser);
  await next();
}
