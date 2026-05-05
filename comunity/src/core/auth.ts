import type { Context, Next } from 'hono'
import type { AppContext } from './types'


export type authUser = {
  id: string
  email: string
  name: string
}

export type appUser = {
  id: string,
  name: string,
  displayName: string,
  role: 'admin' | 'user'
}

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  
    // todo: JWTトークンの検証とユーザー情報の取得 --- IGNORE ---
    c.set('appUser', 
        {
            id: 'user-123',
            name: 'johndoe',
            displayName: 'John Doe',
            role: 'admin'
        }
    ) 

  await next()
}