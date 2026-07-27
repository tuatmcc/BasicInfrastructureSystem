import type { Context, Next } from 'hono'
import { sql, type ExtractTablesWithRelations } from 'drizzle-orm'
import {
  drizzle,
  type NodePgDatabase,
  type NodePgTransaction,
} from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import * as schema from '../../../share/drizzle/schema'
import type { AppContext } from './types'

export type AppDatabase = NodePgDatabase<typeof schema>
export type AppTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export type RlsIdentity = {
  userId: string
  memberId: string | null
  role: 'admin' | 'user' | ''
}

export type RlsDatabase = {
  /**
   * Replaces the request's identity for transactions started after this call.
   * The identity is copied when transaction() is invoked.
   */
  setIdentity(identity: RlsIdentity): void
  /**
   * Runs database-only work in a short transaction. Never await network I/O in
   * the callback: Hyperdrive pins one origin connection until it completes.
   */
  transaction<T>(operation: (tx: AppTransaction) => Promise<T>): Promise<T>
}

// Keep Better Auth's unscoped adapter database out of AppContext.Variables so
// ordinary route services cannot accidentally bypass the RLS transaction API.
const authDatabases = new WeakMap<object, AppDatabase>()

export const getAuthDatabase = (context: object): AppDatabase => {
  const database = authDatabases.get(context)
  if (!database) throw new Error('Authentication database is not initialized')
  return database
}

type RuntimeRoleProbe = {
  roleName: string
  isSuperuser: boolean
  bypassesRls: boolean
  usesAppRls: boolean
}

export const assertSafeRuntimeRole = (probe: RuntimeRoleProbe) => {
  if (probe.isSuperuser || probe.bypassesRls || !probe.usesAppRls) {
    throw new Error(
      `Unsafe database runtime role ${probe.roleName}: require a non-superuser, `
      + 'NOBYPASSRLS login role that inherits app_rls',
    )
  }
}

const anonymousIdentity: RlsIdentity = {
  userId: '',
  memberId: null,
  role: '',
}

export const createRlsDatabase = (database: AppDatabase): RlsDatabase => {
  let identity = anonymousIdentity
  let transactionTail: Promise<void> = Promise.resolve()

  const runSerialized = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = transactionTail.then(operation, operation)
    transactionTail = result.then(() => undefined, () => undefined)
    return result
  }

  return {
    setIdentity(nextIdentity) {
      identity = { ...nextIdentity }
    },
    transaction(operation) {
      // Snapshot now so later authentication/context changes cannot alter work
      // that has already been queued on this request's single pg Client.
      const transactionIdentity = { ...identity }

      return runSerialized(() => database.transaction(async (tx) => {
        // Hyperdrive uses transaction pooling. Role and RLS settings must be
        // LOCAL to this transaction so a pooled origin connection cannot carry
        // one request's authorization context into another request.
        await tx.execute(sql.raw('set local role app_rls'))
        await tx.execute(sql`
          select
            set_config('app.current_user_id', ${transactionIdentity.userId}, true),
            set_config('app.current_member_id', ${transactionIdentity.memberId ?? ''}, true),
            set_config('app.current_user_role', ${transactionIdentity.role}, true),
            set_config('statement_timeout', '15000', true),
            set_config('lock_timeout', '5000', true),
            set_config('idle_in_transaction_session_timeout', '5000', true)
        `)
        return operation(tx)
      }))
    },
  }
}

const verifyRuntimeRole = async (client: Client) => {
  const result = await client.query<RuntimeRoleProbe>(`
    select
      current_user as "roleName",
      current_setting('is_superuser') = 'on' as "isSuperuser",
      coalesce(
        (select rolbypassrls from pg_roles where rolname = current_user),
        true
      ) as "bypassesRls",
      pg_has_role(current_user, 'app_rls', 'USAGE') as "usesAppRls"
  `)
  const probe = result.rows[0]
  if (!probe) throw new Error('Could not verify the database runtime role')
  assertSafeRuntimeRole(probe)
}

export const dbMiddleware = async (c: Context<AppContext>, next: Next) => {
  const connectionString = c.env.HYPERDRIVE?.connectionString || c.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('Database connection string (DATABASE_URL or HYPERDRIVE) is not set')
  }

  // Hyperdrive and PostgreSQL connection strings own their TLS policy. Never
  // disable certificate verification in application code.
  const client = new Client({ connectionString })
  await client.connect()

  try {
    await verifyRuntimeRole(client)
    const authDb = drizzle(client, { schema })
    authDatabases.set(c, authDb)
    c.set('db', createRlsDatabase(authDb))
    await next()
  } finally {
    c.executionCtx.waitUntil(client.end())
  }
}
