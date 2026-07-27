import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isPublicAsset = pathname.match(/\.(.*)$/)
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isPublicAsset) return NextResponse.next()

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
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('[Middleware] Configuration error: JWT_SECRET environment variable is missing.');
        }

        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(jwtSecret)
        const { payload } = await jwtVerify(token.value, secret)
        if (payload.role !== 'admin') {
          return NextResponse.redirect(new URL('/me', request.url))
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
