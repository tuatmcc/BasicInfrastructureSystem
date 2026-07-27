import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityProviderError } from '../error';
import { getCurrentDiscordUser } from './oauth';

test('getCurrentDiscordUser verifies the bearer token and maps the Discord profile', async () => {
  const calls: Array<{ input: string; authorization: string | null }> = [];
  const user = await getCurrentDiscordUser('oauth-token', async (input, init) => {
    const headers = new Headers(init?.headers);
    calls.push({
      input: String(input),
      authorization: headers.get('Authorization'),
    });
    return Response.json({
      id: '123456789012345678',
      username: 'club-member',
      global_name: 'Club Member',
      avatar: 'avatar-hash',
    });
  });

  assert.deepEqual(calls, [{
    input: 'https://discord.com/api/v10/users/@me',
    authorization: 'Bearer oauth-token',
  }]);
  assert.deepEqual(user, {
    id: '123456789012345678',
    username: 'club-member',
    displayName: 'Club Member',
    avatarUrl: 'https://cdn.discordapp.com/avatars/123456789012345678/avatar-hash.png',
  });
});

test('getCurrentDiscordUser reports provider authentication failures without exposing the token', async () => {
  await assert.rejects(
    () => getCurrentDiscordUser('sensitive-token', async () => Response.json(
      { message: '401: Unauthorized' },
      { status: 401 },
    )),
    (error) => (
      error instanceof CommunityProviderError
      && error.status === 401
      && !error.message.includes('sensitive-token')
    ),
  );
});

test('getCurrentDiscordUser rejects malformed provider responses as a bad gateway', async () => {
  await assert.rejects(
    () => getCurrentDiscordUser('oauth-token', async () => Response.json({ username: '' })),
    (error) => error instanceof CommunityProviderError && error.status === 502,
  );
});
