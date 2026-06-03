import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'

import type { AppContext } from './core/types'
import { dbMiddleware } from './core/db'
import { authMiddleware } from './core/auth'
import { errorHandler } from './core/error'

import { userRouter } from './api_v0/menber/router'
import { gradeRouter } from './api_v0/grade/router'

const app = new OpenAPIHono<AppContext>()

  // CORSの調整: credentialsを許可し、originを動的に設定
  .use('*', async (c, next) => {
    // フロントエンドからのリクエストに対してCookieを許可する
    const corsMiddleware = cors({
      origin: 'http://localhost:3000', // 必要に応じて環境変数から取得
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
    return corsMiddleware(c, next)
  })
  .use('*',dbMiddleware)
  .use('/api/*',authMiddleware)
  .get('/health', (c: any): Response => c.json({ status: 'ok' }))
  .get('doc',(c: any): Response => {
    return c.json((app as OpenAPIHono).getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        title: 'Basic Infrastructure System API',
        version: '1.0.0',
        description: 'API documentation for Basic Infrastructure System'
      }
    }));
  })
  .use('/ui', swaggerUI({ url: '/doc' }))
  .route('/api/menber', userRouter)
  .route('/api/grade', gradeRouter)

  .onError(errorHandler)
  
export type App = typeof app

export default app;
