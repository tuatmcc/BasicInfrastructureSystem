import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isPublicAsset = pathname.match(/\.(.*)$/)

  if (isPublicAsset) return NextResponse.next()

  // DEBUG: すべてのクッキーを出力
  const allCookies = request.cookies.getAll().map(c => c.name)
  console.log(`[Middleware Debug] Path: ${pathname}, Cookies: ${allCookies.join(', ')}`)

  // Better Auth uses session_token, but we use app-authorization (JWT)
  const token = request.cookies.get('app-authorization')

  if (!token && !isLoginPage) {
    console.log(`[Middleware] No custom JWT token found. Redirecting to /login.`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isLoginPage) {
    console.log(`[Middleware] Token found. Redirecting from login to home.`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin check
  if (token && pathname.startsWith('/event')) {
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('[Middleware] Configuration error: JWT_SECRET environment variable is missing.');
        }

        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(jwtSecret)
        const { payload } = await jwtVerify(token.value, secret)
        if (payload.role !== 'admin') {
          return NextResponse.redirect(new URL('/', request.url))
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
