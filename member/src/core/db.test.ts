import assert from 'node:assert/strict'
import test from 'node:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { assertSafeRuntimeRole, createRlsDatabase } from './db'

const dialect = new PgDialect()

test('RLS transactions snapshot identity and serialize SET LOCAL context', async () => {
  const transactions: Array<Array<{ sql: string; params: unknown[] }>> = []
  const database = {
    transaction: async <T>(operation: (tx: { execute(statement: SQL): Promise<void> }) => Promise<T>) => {
      const statements: Array<{ sql: string; params: unknown[] }> = []
      transactions.push(statements)
      return operation({
        execute: async (statement) => {
          const query = dialect.sqlToQuery(statement)
          statements.push({ sql: query.sql, params: query.params })
        },
      })
    },
  }
  const rls = createRlsDatabase(database as never)

  rls.setIdentity({ userId: 'user-one', memberId: null, role: 'user' })
  const first = rls.transaction(async () => 'first')
  rls.setIdentity({
    userId: 'user-two',
    memberId: '00000000-0000-4000-8000-000000000002',
    role: 'admin',
  })
  const second = rls.transaction(async () => 'second')

  assert.deepEqual(await Promise.all([first, second]), ['first', 'second'])
  assert.equal(transactions.length, 2)

  for (const statements of transactions) {
    assert.match(statements[0]?.sql ?? '', /^set local role app_rls$/)
    assert.match(statements[1]?.sql ?? '', /set_config\('app\.current_user_id'/)
    assert.match(statements[1]?.sql ?? '', /set_config\('statement_timeout'/)
    assert.match(statements[1]?.sql ?? '', /set_config\('lock_timeout'/)
    assert.match(statements[1]?.sql ?? '', /set_config\('idle_in_transaction_session_timeout'/)
  }
  assert.deepEqual(transactions[0][1]?.params.slice(0, 3), ['user-one', '', 'user'])
  assert.deepEqual(
    transactions[1][1]?.params.slice(0, 3),
    ['user-two', '00000000-0000-4000-8000-000000000002', 'admin'],
  )
})

test('database runtime role validation fails closed for privileged or non-RLS roles', () => {
  assert.doesNotThrow(() => assertSafeRuntimeRole({
    roleName: 'app_runtime',
    isSuperuser: false,
    bypassesRls: false,
    usesAppRls: true,
  }))

  for (const probe of [
    { roleName: 'postgres', isSuperuser: true, bypassesRls: true, usesAppRls: true },
    { roleName: 'bypass', isSuperuser: false, bypassesRls: true, usesAppRls: true },
    { roleName: 'unprivileged', isSuperuser: false, bypassesRls: false, usesAppRls: false },
  ]) {
    assert.throws(() => assertSafeRuntimeRole(probe), /Unsafe database runtime role/)
  }
})

