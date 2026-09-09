import type { Context, Next } from 'hono'
import { AppContext } from './types'
import type { RlsDatabase } from './db'
import { verify } from 'hono/jwt'
import { and, eq, gt } from 'drizzle-orm'
import { appAccounts, memberRoles, rolePermissions, session, user } from '../../../share/drizzle/schema'

export type authUser = {
  id: string
}

export type appUser = {
  id: string
  name: string
  memberId: string | null
  role: 'admin' | 'user'
  /**
   * What this caller may do, resolved through the roles their member holds.
   * Ask with `can()` from share/permissions; never branch on `role`.
   */
  permissions: readonly string[]
}


// Who the caller is, according to the authentication store.
const subjectSelection = {
  id: user.id,
  name: user.name,
}

// What the caller may do, according to the domain: the account, and one row per
// permission the member's roles carry. Left joins because someone who has not
// joined has no member row and a member may hold no roles, so those columns
// come back null.
const accountSelection = {
  memberId: appAccounts.memberId,
  role: appAccounts.role,
  permissionKey: rolePermissions.permissionKey,
}

// The same permission can arrive from two roles, and a caller holding no roles
// arrives as a single row whose permission column is null.
const collectPermissions = (grants: { permissionKey: string | null }[]) => (
  Array.from(new Set(
    grants.map((grant) => grant.permissionKey).filter((key) => key !== null),
  ))
)

// This is the boundary between the authentication store and the domain, and the
// only place that reads both. The two lookups stay separate rather than joining
// across app_auth and public, so moving the authentication store to its own
// database turns the first one into a remote call and leaves the second alone.
const loadAppUser = async (
  c: Context<AppContext>,
  userId: string,
  sessionId?: string,
): Promise<appUser | null> => {
  const resolved = await c.get('db').transaction(async (db) => {
    const [subject] = sessionId
      ? await db
        .select(subjectSelection)
        .from(user)
        .innerJoin(session, eq(session.userId, user.id))
        .where(and(
          eq(user.id, userId),
          eq(session.id, sessionId),
          gt(session.expiresAt, new Date()),
        ))
        .limit(1)
      : await db
        .select(subjectSelection)
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    if (!subject) return null;

    const grants = await db
      .select(accountSelection)
      .from(appAccounts)
      .leftJoin(memberRoles, eq(memberRoles.memberId, appAccounts.memberId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleKey, memberRoles.roleKey))
      .where(eq(appAccounts.userId, subject.id));

    const [account] = grants;

    if (!account) return null;

    return {
      id: subject.id,
      name: subject.name,
      memberId: account.memberId,
      role: account.role === 'admin' ? 'admin' as const : 'user' as const,
      permissions: collectPermissions(grants),
    };
  });

  if (!resolved) {
    return null;
  }

  c.get('db').setIdentity({
    userId: resolved.id,
    memberId: resolved.memberId,
    role: resolved.role,
  });

  return resolved;
}

// The development bypass skips token verification entirely, so reaching it on a
// deployed Worker would leave the API open. NODE_ENV is an ordinary variable
// that a misconfigured deployment can carry, but the hostname the request
// actually arrived on is not, so both must agree before the bypass applies.
const isLocalRequest = (c: Context<AppContext>) => {
  try {
    const hostname = new URL(c.req.url).hostname
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1'
      || hostname === '[::1]'
  } catch {
    return false
  }
}

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  let userId: string;
  let sessionId: string | undefined;

  if (c.env.NODE_ENV === 'development' && isLocalRequest(c)) {
    // For development purposes, resolve the mock user's latest database state.
    const developmentUserId = c.env.DEV_USER_ID?.trim();
    if (!developmentUserId) {
      return c.json({ error: 'Development authentication requires DEV_USER_ID' }, 500);
    }
    userId = developmentUserId;
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
