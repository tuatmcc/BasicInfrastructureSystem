import type { Context, Next } from 'hono'
import type { AppContext } from './types'
import { discord } from '../lib/community/discord/main'


export const communityMiddleware = async (c: Context<AppContext>, next: Next) => {
  
    
    c.set("community",
        discord
    ) 

  await next()
}