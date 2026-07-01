import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DiscordProvider } from './main';

const loadRootEnv = () => {
    const envPath = resolve(process.cwd(), '../.env');
    if (!existsSync(envPath)) return;

    const env = readFileSync(envPath, 'utf8');
    for (const line of env.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex);
        const value = trimmed.slice(separatorIndex + 1).replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = value;
    }
};

const shouldRunLiveTests = process.env.RUN_DISCORD_LIVE_TESTS === '1';

test('live Discord event notification can be sent and fetched', { skip: !shouldRunLiveTests }, async () => {
    loadRootEnv();

    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const channelId = process.env.DISCORD_TEST_CHANNEL_ID;
    const shouldDeleteMessage = process.env.DISCORD_LIVE_TEST_DELETE_MESSAGE === '1';

    assert.ok(token, 'DISCORD_TOKEN is required for live Discord tests');
    assert.ok(guildId, 'DISCORD_GUILD_ID is required for live Discord tests');
    assert.ok(channelId, 'DISCORD_TEST_CHANNEL_ID is required for live Discord tests');

    const provider = new DiscordProvider(token, guildId);
    const content = `[live-test] BasicInfrastructureSystem event notification ${new Date().toISOString()}`;
    const result = await provider.sendMessage({
        channelId,
        content,
    });

    assert.match(result.messageId, /^\d{17,20}$/);

    const message = await provider.getMessage(channelId, result.messageId);
    assert.equal(message.channelId, channelId);
    assert.equal(message.content, content);

    if (shouldDeleteMessage) {
        await provider.request(
            'DELETE',
            `/channels/${channelId}/messages/${result.messageId}`,
        );
    }
});
