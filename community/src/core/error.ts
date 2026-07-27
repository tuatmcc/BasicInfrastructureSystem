import type { ErrorHandler } from 'hono'
import { AppContext } from './types'

export const errorHandler: ErrorHandler<AppContext> = (err, c) => {
  console.error('Unhandled Exception:', err)
  return c.json({
    error: 'Internal Server Error',
  }, 500)
}
