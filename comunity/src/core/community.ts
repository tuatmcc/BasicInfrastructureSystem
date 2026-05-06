import type { Context, Next } from 'hono'
import type { AppContext } from './types'
import { DiscordProvider } from '../lib/community/discord/main'

export const communityMiddleware = async (c: Context<AppContext>, next: Next) => {
  const token = c.env.DISCORD_TOKEN;
  const guildId = c.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    console.error('[CommunityMiddleware] Configuration missing: DISCORD_TOKEN or DISCORD_GUILD_ID is not set.');
  }

  const provider = new DiscordProvider(token, guildId);

  c.set('community', provider);

  await next();
}

