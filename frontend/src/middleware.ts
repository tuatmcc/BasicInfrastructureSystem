import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isPublicAsset = pathname.match(/\.(.*)$/)
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isPublicAsset) return NextResponse.next()

  // Unlike the Workers, this is safe to key on NODE_ENV: Next inlines it at
  // build time, so a production build cannot be talked back into the bypass by
  // a runtime variable. The Workers read theirs at runtime and therefore also
  // require a local hostname.
  if (isDevelopment) {
    return NextResponse.next()
  }

  // Better Auth uses session_token, but we use app-authorization (JWT)
  const token = request.cookies.get('app-authorization')

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin check and default landing split
  if (token && (pathname.startsWith('/event') || pathname.startsWith('/admin') || pathname === '/')) {
    try {
        // The API validates the session and resolves current database permissions.
        // A signed JWT's login-time role cannot reflect a later revocation.
        const apiUrl = process.env.NEXT_PUBLIC_COMMUNITY_API_URL;
        if (!apiUrl) throw new Error('Community API URL is not configured');
        const response = await fetch(new URL('/api/v0/user/me', apiUrl), {
          headers: { Authorization: `Bearer ${token.value}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return NextResponse.redirect(new URL('/login', request.url));
        const currentUser = await response.json() as { permissions?: unknown };
        const permissions = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
        const required = pathname.startsWith('/admin') ? 'member.read_private' : 'event.manage';
        if (!permissions.includes(required)) {
          return NextResponse.redirect(new URL('/me', request.url));
        }
    } catch (error) {
        console.error('[Middleware] Admin check error:', error)
        return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
