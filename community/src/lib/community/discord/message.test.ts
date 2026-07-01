import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getMessageAPI,
    listMessageReactionUsersAPI,
    sendMessageAPI,
} from './message';
import { CommunityProviderError } from '../error';

const createProvider = (response: unknown) => {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];

    return {
        provider: {
            request: async (method: string, path: string, body?: unknown) => {
                calls.push({ method, path, body });
                return response;
            },
        } as any,
        calls,
    };
};

test('sendMessageAPI posts an event notification to the Discord channel with role mentions', async () => {
    const { provider, calls } = createProvider({ id: '323456789012345678' });

    const result = await sendMessageAPI(provider, {
        channelId: '123456789012345678',
        content: 'イベント通知',
        mentionRoleIds: ['223456789012345678'],
    });

    assert.deepEqual(result, { messageId: '323456789012345678' });
    assert.deepEqual(calls, [{
        method: 'POST',
        path: '/channels/123456789012345678/messages',
        body: {
            content: '<@&223456789012345678> イベント通知',
            allowed_mentions: { roles: ['223456789012345678'] },
        },
    }]);
});

test('sendMessageAPI rejects messages that exceed Discord content limits after mentions are added', async () => {
    const { provider } = createProvider({ id: '323456789012345678' });

    await assert.rejects(
        () => sendMessageAPI(provider, {
            channelId: '123456789012345678',
            content: 'x'.repeat(1990),
            mentionRoleIds: ['223456789012345678'],
        }),
        (error) => error instanceof CommunityProviderError && error.status === 400,
    );
});

test('getMessageAPI parses Discord reactions from a fetched message', async () => {
    const { provider, calls } = createProvider({
        id: '323456789012345678',
        channel_id: '123456789012345678',
        content: 'イベント通知',
        timestamp: '2026-07-01T00:00:00.000000+00:00',
        author: {
            id: '423456789012345678',
            username: 'bot',
            global_name: null,
            bot: true,
        },
        reactions: [
            { emoji: { name: '✅' }, count: 2 },
            { emoji: { name: 'custom', id: '523456789012345678' }, count: 1 },
        ],
    });

    const message = await getMessageAPI(provider, '123456789012345678', '323456789012345678');

    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[0].path, '/channels/123456789012345678/messages/323456789012345678');
    assert.deepEqual(message.reactions, [
        { emoji: '✅', count: 2 },
        { emoji: 'custom:523456789012345678', count: 1 },
    ]);
});

test('listMessageReactionUsersAPI fetches and parses users who reacted to a message', async () => {
    const { provider, calls } = createProvider([
        {
            id: '623456789012345678',
            username: 'taro',
            global_name: 'Taro',
            bot: false,
        },
    ]);

    const users = await listMessageReactionUsersAPI(
        provider,
        '123456789012345678',
        '323456789012345678',
        '✅',
    );

    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[0].path, '/channels/123456789012345678/messages/323456789012345678/reactions/%E2%9C%85?limit=100');
    assert.deepEqual(users, [{
        id: '623456789012345678',
        username: 'taro',
        globalName: 'Taro',
        bot: false,
    }]);
});
