import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'

import type { AppContext } from './core/types'
import { dbMiddleware } from './core/db'
import { authMiddleware } from './core/auth'
import { communityMiddleware } from './core/community'
import { errorHandler } from './core/error'

import { apiv0Router } from './api_v0/router'
import { authRouter } from './auth/router'

const app = new OpenAPIHono<AppContext>()

  // CORSの調整: credentialsを許可し、originを動的に設定可能に
  .use('*', async (c, next) => {
    const corsMiddleware = cors({
      origin: c.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
    return corsMiddleware(c, next)
  })
  .use('/api/*', dbMiddleware)
  .use('/api/v0/*', communityMiddleware)
  .use('/api/v0/*', authMiddleware)
  
  .get('/health', (c: any): Response => c.json({ status: 'ok' }))
  .get('doc', (c: any): Response => {
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
  .route('/api/auth', authRouter)
  .route('/api/v0', apiv0Router)

  .onError(errorHandler)
  
export type App = typeof app

export default app;
