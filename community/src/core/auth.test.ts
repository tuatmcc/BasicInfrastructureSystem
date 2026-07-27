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

test('the development bypass cannot be reached from a deployed hostname', async () => {
  // A deployment that carries NODE_ENV=development by mistake must still verify
  // tokens. Without a token the request is rejected rather than served as
  // DEV_USER_ID.
  const responses: unknown[] = [];
  let nextCalled = false;

  const context = {
    env: {
      NODE_ENV: 'development',
      DEV_USER_ID: 'user-1',
      JWT_SECRET: 'jwt-secret-that-is-long-enough-for-the-test',
    },
    req: {
      url: 'https://community.example.com/api/v0/member/me',
      header: () => undefined,
      raw: { headers: new Headers() },
    },
    get: () => {
      throw new Error('the database must not be reached without authentication');
    },
    set: () => {
      throw new Error('no application user may be set');
    },
    json: (body: unknown, status: number) => {
      responses.push({ body, status });
      return { body, status };
    },
  };

  await authMiddleware(context as never, async () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.deepEqual(responses, [{
    body: { error: 'Unauthorized: No token provided' },
    status: 401,
  }]);
});

test('the development bypass still applies to a local request', async () => {
  let capturedDevUser: appUser | undefined;
  let selectCall = 0;
  const transaction = {
    select: () => {
      selectCall += 1;
      const rows = selectCall === 1
        ? [{ id: 'user-1', name: 'Local Dev' }]
        : [{ memberId: null, role: 'user' }];
      const where = () => ({ limit: async () => rows });
      return { from: () => ({ innerJoin: () => ({ where }), where }) };
    },
  };
  const db = {
    transaction: (operation: (tx: unknown) => Promise<unknown>) => operation(transaction),
    setIdentity: () => {},
  };

  const context = {
    env: { NODE_ENV: 'development', DEV_USER_ID: 'user-1' },
    req: { url: 'http://localhost:8787/api/v0/user/me', header: () => undefined },
    get: (key: string) => key === 'db' ? db : undefined,
    set: (_key: string, value: appUser) => { capturedDevUser = value; },
    json: (body: unknown, status: number) => ({ body, status }),
  };

  await authMiddleware(context as never, async () => {});
  assert.equal(capturedDevUser?.id, 'user-1');
});
