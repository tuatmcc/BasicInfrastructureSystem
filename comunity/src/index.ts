import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'

import type { AppContext } from './core/types'
import { dbMiddleware } from './core/db'
import { authMiddleware } from './core/auth'
import { errorHandler } from './core/error'

import { apiv0Router } from './api_v0/router'

const app = new OpenAPIHono<AppContext>()

  .use('*',cors())
  .use('*',dbMiddleware)
  .use('*',authMiddleware)
  
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
  .route('/api/v0', apiv0Router)

  .onError(errorHandler)
  
export type App = typeof app

export default app;
