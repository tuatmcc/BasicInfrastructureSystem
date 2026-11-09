import { NextResponse, type NextRequest } from 'next/server'

// 画面側では「ログインしているか」だけを確かめる。
// 権限は API とデータベースが確かめ、足りなければ 403 を返す。各ページはその 403 を受けて表示を変える。
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isPublicAsset = pathname.match(/\.(.*)$/)
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isPublicAsset) return NextResponse.next()

  // Worker と違い、ここは NODE_ENV だけで判定してよい。Next はビルド時に値を埋め込むので、
  // 本番用にビルドしたものが実行時の変数で開発用の動作に切り替わることはない。
  // （Worker は実行時に読むので、ホスト名が localhost であることも条件にしている。）
  if (isDevelopment) {
    return NextResponse.next()
  }

  // Better Auth の session_token ではなく、独自に発行した JWT（app-authorization）を見る。
  const token = request.cookies.get('app-authorization')

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
