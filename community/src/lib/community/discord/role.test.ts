import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityProviderError } from '../error';
import { DiscordProvider } from './main';
import { getGuildMembershipAPI } from './role';

test('getGuildMembershipAPI correlates the requested user and maps nickname and roles', async () => {
  const provider = new DiscordProvider('bot-token', '223456789012345678');
  const calls: string[] = [];
  const responses: unknown[] = [
    {
      user: { id: '123456789012345678' },
      nick: '部内ニックネーム',
      roles: ['323456789012345678'],
    },
    [
      { id: '323456789012345678', name: '部員' },
      { id: '423456789012345678', name: '管理者' },
    ],
  ];
  provider.request = async <T>(_method: string, path: string): Promise<T> => {
    calls.push(path);
    return responses.shift() as T;
  };

  const membership = await getGuildMembershipAPI(provider, '123456789012345678');

  assert.deepEqual(calls, [
    '/guilds/223456789012345678/members/123456789012345678',
    '/guilds/223456789012345678/roles',
  ]);
  assert.deepEqual(membership, {
    userId: '123456789012345678',
    nickname: '部内ニックネーム',
    roles: [{ id: '323456789012345678', name: '部員' }],
  });
});

test('getGuildMembershipAPI rejects a guild member response for another user', async () => {
  const provider = new DiscordProvider('bot-token', '223456789012345678');
  provider.request = async <T>(): Promise<T> => ({
    user: { id: '999456789012345678' },
    nick: null,
    roles: [],
  }) as T;

  await assert.rejects(
    () => getGuildMembershipAPI(provider, '123456789012345678'),
    (error) => error instanceof CommunityProviderError && error.status === 502,
  );
});
