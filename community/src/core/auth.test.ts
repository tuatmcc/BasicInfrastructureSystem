import assert from 'node:assert/strict';
import test from 'node:test';
import { sign } from 'hono/jwt';
import { authMiddleware, type appUser } from './auth';

test('auth middleware reloads the application user and does not turn downstream failures into 401 responses', async () => {
  const jwtSecret = 'jwt-secret-for-community-auth-boundary-test';
  const token = await sign({ id: 'user-1', sid: 'session-1' }, jwtSecret, 'HS256');
  let capturedUser: appUser | undefined;
  let capturedIdentity: unknown;

  // The middleware asks the authentication store who the caller is, then asks
  // the domain what that subject may do. Two selects, never a join across them.
  let selectCall = 0;
  const transaction = {
    select: () => {
      selectCall += 1;
      const rows = selectCall === 1
        ? [{ id: 'user-1', name: 'Test User' }]
        : [{ memberId: null, role: 'user' }];
      const where = () => ({ limit: async () => rows });
      return { from: () => ({ innerJoin: () => ({ where }), where }) };
    },
  };
  const db = {
    transaction: (operation: (tx: unknown) => Promise<unknown>) => operation(transaction),
    setIdentity: (identity: unknown) => {
      capturedIdentity = identity;
    },
  };
  const context = {
    env: {
      NODE_ENV: 'production',
      JWT_SECRET: jwtSecret,
    },
    req: {
      header: (name: string) => name === 'Authorization' ? `Bearer ${token}` : undefined,
    },
    get: (key: string) => {
      if (key === 'db') return db;
      throw new Error(`Unexpected context key: ${key}`);
    },
    set: (key: string, value: appUser) => {
      assert.equal(key, 'appUser');
      capturedUser = value;
    },
    json: (body: unknown, status: number) => ({ body, status }),
  };

  await assert.rejects(
    authMiddleware(context as never, async () => {
      throw new Error('downstream database failure');
    }),
    /downstream database failure/,
  );

  assert.deepEqual(capturedUser, {
    id: 'user-1',
    name: 'Test User',
    memberId: null,
    role: 'user',
  });
  assert.deepEqual(capturedIdentity, {
    userId: 'user-1',
    memberId: null,
    role: 'user',
  });
});

test('auth middleware rejects legacy JWTs without a Better Auth session binding', async () => {
  const jwtSecret = 'jwt-secret-for-community-session-binding-test';
  const token = await sign({ id: 'user-1' }, jwtSecret, 'HS256');
  const result = await authMiddleware({
    env: { NODE_ENV: 'production', JWT_SECRET: jwtSecret },
    req: { header: () => `Bearer ${token}` },
    json: (body: unknown, status: number) => ({ body, status }),
  } as never, async () => {});

  assert.deepEqual(result, {
    body: { error: 'Unauthorized: Session binding is missing' },
    status: 401,
  });
});
