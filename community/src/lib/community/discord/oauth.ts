import { CommunityProviderError } from '../error';
import { DiscordOAuthUser, DiscordOAuthUserSchema } from '../type';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

type DiscordOAuthProfile = {
  id?: unknown;
  username?: unknown;
  global_name?: unknown;
  avatar?: unknown;
};

const buildDiscordAvatarUrl = (profile: DiscordOAuthProfile): string | null => {
  if (typeof profile.id !== 'string' || typeof profile.avatar !== 'string') {
    return null;
  }

  const format = profile.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
};

export const getCurrentDiscordUser = async (
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<DiscordOAuthUser> => {
  const response = await fetcher(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new CommunityProviderError(
      'Discord OAuth user verification failed',
      response.status,
      'discord',
      details,
    );
  }

  const profile = await response.json<DiscordOAuthProfile>();
  const parsed = DiscordOAuthUserSchema.safeParse({
    id: profile.id,
    username: profile.username,
    globalName: profile.global_name ?? null,
    avatarUrl: buildDiscordAvatarUrl(profile),
  });

  if (!parsed.success) {
    throw new CommunityProviderError(
      'Discord OAuth user response was invalid',
      502,
      'discord',
      parsed.error.issues,
    );
  }

  return parsed.data;
};
