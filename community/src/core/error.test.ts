import assert from 'node:assert/strict'
import test from 'node:test'
import { errorHandler } from './error'

test('internal errors are logged without exposing SQL or personal data', async () => {
  const internalError = new Error('Failed query with params: student@example.test')
  const logged: unknown[][] = []
  const originalConsoleError = console.error
  console.error = (...values: unknown[]) => logged.push(values)

  try {
    const response = await errorHandler(internalError, {
      json: (body: unknown, status: number) => ({ body, status }),
    } as never)
    assert.deepEqual(response, {
      body: { error: 'Internal Server Error' },
      status: 500,
    })
    assert.deepEqual(logged, [['Unhandled Exception:', internalError]])
  } finally {
    console.error = originalConsoleError
  }
})
