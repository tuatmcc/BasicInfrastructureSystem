import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createMessageService,
    getMessageService,
    listMessagesService,
} from './service';

const adminUser = {
    id: 'admin-1',
    discordid: null,
    name: 'Admin',
    displayName: 'Admin',
    role: 'admin' as const,
};

const normalUser = {
    ...adminUser,
    role: 'user' as const,
};

const createContext = (overrides: {
    appUser?: typeof adminUser | typeof normalUser;
    body?: unknown;
    params?: Record<string, string>;
    community?: unknown;
    db?: unknown;
}) => {
    const jsonCalls: Array<{ body: unknown; status: number }> = [];
    const valuesCalls: unknown[] = [];
    const body = overrides.body ?? {
        channelId: '123456789012345678',
        content: 'イベント通知',
        mentionRoleIds: ['223456789012345678'],
    };
    const community = overrides.community ?? {
        sendMessage: async () => ({ messageId: '323456789012345678' }),
    };
    const transactionDatabase = overrides.db ?? {
        insert: () => ({
            values: (values: unknown) => {
                valuesCalls.push(values);
                return {
                    returning: async () => [{
                        id: 'event-1',
                        ...(values as object),
                        messageId: '323456789012345678',
                        createdAt: '2026-07-01T00:00:00Z',
                        updatedAt: '2026-07-01T00:00:00Z',
                    }],
                };
            },
        }),
    };
    let openTransactions = 0;
    const db = {
        transaction: async (operation: (tx: unknown) => Promise<unknown>) => {
            openTransactions += 1;
            try {
                return await operation(transactionDatabase);
            } finally {
                openTransactions -= 1;
            }
        },
    };

    return {
        c: {
            req: {
                valid: () => body,
                param: (key: string) => overrides.params?.[key],
            },
            get: (key: string) => {
                if (key === 'appUser') return overrides.appUser ?? adminUser;
                if (key === 'community') return community;
                if (key === 'db') return db;
                throw new Error(`Unexpected context key: ${key}`);
            },
            json: (responseBody: unknown, status: number) => {
                jsonCalls.push({ body: responseBody, status });
                return { body: responseBody, status };
            },
        } as any,
        jsonCalls,
        valuesCalls,
        isTransactionOpen: () => openTransactions > 0,
    };
};

test('createMessageService sends an event notification to Discord and saves the event message', async () => {
    const sendMessageCalls: unknown[] = [];
    let isTransactionOpen = () => false;
    const testContext = createContext({
        community: {
            sendMessage: async (input: unknown) => {
                assert.equal(isTransactionOpen(), false);
                sendMessageCalls.push(input);
                return { messageId: '323456789012345678' };
            },
        },
    });
    const { c, valuesCalls } = testContext;
    isTransactionOpen = testContext.isTransactionOpen;

    const response = await (createMessageService as any)(c);

    assert.equal(response.status, 201);
    assert.deepEqual(sendMessageCalls, [{
        channelId: '123456789012345678',
        content: 'イベント通知',
        mentionRoleIds: ['223456789012345678'],
    }]);
    assert.deepEqual(valuesCalls, [{
        channelId: '123456789012345678',
        messageId: '323456789012345678',
        content: 'イベント通知',
        createdBy: 'admin-1',
    }]);
    assert.equal((response.body as { id: string }).id, 'event-1');
});

test('createMessageService rejects non-admin users before sending to Discord', async () => {
    let sendCalled = false;
    const { c } = createContext({
        appUser: normalUser,
        community: {
            sendMessage: async () => {
                sendCalled = true;
                return { messageId: '323456789012345678' };
            },
        },
    });

    const response = await (createMessageService as any)(c);

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { error: 'Forbidden' });
    assert.equal(sendCalled, false);
});

test('listMessagesService returns selectable event notifications for admins', async () => {
    const messages = [
        {
            id: 'event-2',
            channelId: '123456789012345678',
            messageId: '423456789012345678',
            content: '新しいイベント',
            createdBy: 'admin-1',
            createdAt: '2026-07-02T00:00:00Z',
            updatedAt: '2026-07-02T00:00:00Z',
        },
        {
            id: 'event-1',
            channelId: '123456789012345678',
            messageId: '323456789012345678',
            content: '古いイベント',
            createdBy: 'admin-1',
            createdAt: '2026-07-01T00:00:00Z',
            updatedAt: '2026-07-01T00:00:00Z',
        },
    ];
    const calls: string[] = [];
    const { c } = createContext({
        db: {
            select: () => {
                calls.push('select');
                return {
                    from: () => {
                        calls.push('from:eventMessages');
                        return {
                            orderBy: () => {
                                calls.push('orderBy:createdAtDesc');
                                return messages;
                            },
                        };
                    },
                };
            },
        },
    });

    const response = await (listMessagesService as any)(c);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, messages);
    assert.deepEqual(calls, ['select', 'from:eventMessages', 'orderBy:createdAtDesc']);
});

test('listMessagesService rejects non-admin users', async () => {
    let selectCalled = false;
    const { c } = createContext({
        appUser: normalUser,
        db: {
            select: () => {
                selectCalled = true;
                return {};
            },
        },
    });

    const response = await (listMessagesService as any)(c);

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { error: 'Forbidden' });
    assert.equal(selectCalled, false);
});

test('getMessageService returns the selected event notification detail', async () => {
    const selectedMessage = {
        id: 'event-1',
        channelId: '123456789012345678',
        messageId: '323456789012345678',
        content: '選択されたイベント',
        createdBy: 'admin-1',
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z',
    };
    const calls: string[] = [];
    const { c } = createContext({
        params: { id: 'event-1' },
        db: {
            select: () => {
                calls.push('select');
                return {
                    from: () => {
                        calls.push('from:eventMessages');
                        return {
                            where: () => {
                                calls.push('where:id');
                                return {
                                    limit: (value: number) => {
                                        calls.push(`limit:${value}`);
                                        return [selectedMessage];
                                    },
                                };
                            },
                        };
                    },
                };
            },
        },
    });

    const response = await (getMessageService as any)(c);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, selectedMessage);
    assert.deepEqual(calls, ['select', 'from:eventMessages', 'where:id', 'limit:1']);
});

test('getMessageService returns 404 when the selected event notification does not exist', async () => {
    const { c } = createContext({
        params: { id: 'missing-event' },
        db: {
            select: () => ({
                from: () => ({
                    where: () => ({
                        limit: () => [],
                    }),
                }),
            }),
        },
    });

    const response = await (getMessageService as any)(c);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Event message not found' });
});
