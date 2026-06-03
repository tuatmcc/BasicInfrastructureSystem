import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../core/types";
import { getAuth, getJwtRoute, getJwtHandler } from "./better-auth";

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
      const { setCookie } = await import('hono/cookie');
      const isLocal = !c.env.COMMUNITY_URL || c.env.COMMUNITY_URL.includes('localhost');
      setCookie(c, 'app-authorization', '', {
        path: '/',
        httpOnly: true,
        secure: !isLocal,
        sameSite: 'Lax',
        maxAge: 0,
        domain: c.env.COOKIE_DOMAIN || undefined,
      });
    }
    
    return res;
  });
