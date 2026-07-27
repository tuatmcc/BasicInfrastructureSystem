import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../core/types";
import { getAuth, getJwtRoute, getJwtHandler } from "./better-auth";
import { serialize } from "hono/utils/cookie";

export const withClearedAppAuthorizationCookie = (
  response: Response,
  options: { isLocal: boolean; domain?: string },
) => {
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', serialize('app-authorization', '', {
    path: '/',
    httpOnly: true,
    secure: !options.isLocal,
    sameSite: 'Lax',
    maxAge: 0,
    domain: options.domain || undefined,
  }));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const authRouter = new OpenAPIHono<AppContext>()
  // 1. JWT Endpoint (OpenAPI Route)
  .openapi(getJwtRoute, getJwtHandler)

  // 2. Better Auth コアハンドラー (ワイルドカード)
  // ベースパスが '/api/auth' のため、ここは '/*' になります
  .on(['GET', 'POST'], '/*', async (c) => {
    const auth = getAuth(c);
    const res = await auth.handler(c.req.raw);
    
    // Clear custom JWT cookie on sign-out
    const url = new URL(c.req.url);
    if (url.pathname.endsWith('/sign-out')) {
      const isLocal = !c.env.COMMUNITY_URL || c.env.COMMUNITY_URL.includes('localhost');
      return withClearedAppAuthorizationCookie(res, {
        isLocal,
        domain: c.env.COOKIE_DOMAIN,
      });
    }
    
    return res;
  });
