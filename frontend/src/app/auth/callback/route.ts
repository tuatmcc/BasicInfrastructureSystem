import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    // 1. クッキーを書き込むためのレスポンスオブジェクトを作成
    const response = NextResponse.redirect(`${origin}/`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    
    // 2. 認証コードをセッションに交換（内部で setAll が呼ばれ、response にクッキーがセットされる）
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 3. クッキーがセットされた response を返す
      return response
    }
  }

  // エラーの場合やコードがない場合は、クリーンな状態でリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
