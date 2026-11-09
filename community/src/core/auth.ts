import type { Context, Next } from 'hono'
import { AppContext } from './types'
import { verify } from 'hono/jwt'
import { and, eq, gt, sql } from 'drizzle-orm'
import { appAccounts, session, user } from '../../../share/drizzle/schema'

export type authUser = {
  id: string
}

export type appUser = {
  id: string
  name: string
  memberId: string | null
  /**
   * この呼び出し元ができること。部員が持つロールからたどって求めた権限の一覧。
   * 判定には share/permissions の `can()` を使い、ロール名で分岐しない。
   */
  permissions: readonly string[]
}

// 認証ストアから見た「呼び出し元が誰か」。
const subjectSelection = {
  id: user.id,
  name: user.name,
}

// 権限は、RLS と同じデータベース関数（app_private.permissions_for）で求める。
const accountSelection = {
  memberId: appAccounts.memberId,
  permissions: sql<string[]>`app_private.permissions_for(${appAccounts.userId})`,
}

// 認証ストアとドメインの境目。両方を読むのはここだけ。
// 2 つの検索は app_auth と public をまたいで結合せず、別々に行う。
// 認証ストアを別のデータベースへ移したとき、1 つ目だけを外部への問い合わせに
// 置き換えれば済むようにするため。
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

    const [account] = await db
      .select(accountSelection)
      .from(appAccounts)
      .where(eq(appAccounts.userId, subject.id));

    if (!account) return null;

    return {
      id: subject.id,
      name: subject.name,
      memberId: account.memberId,
      permissions: account.permissions,
    };
  });

  if (!resolved) {
    return null;
  }

  c.get('db').setIdentity({
    userId: resolved.id,
  });

  return resolved;
}

// 開発用の抜け道はトークンの検証を丸ごと飛ばすので、デプロイ先で有効になると
// API を誰でも使えてしまう。NODE_ENV は設定ミスで本番にも入り得るただの変数だが、
// リクエストが実際に届いたホスト名はそうではない。両方がそろったときだけ抜け道を使う。
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
