import { createRoute, z } from '@hono/zod-openapi';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
}).openapi('IdentityVerificationError');

const verifiedDiscordIdentitySchema = z.object({
  identityId: z.string().uuid(),
  provider: z.literal('discord'),
  providerAccountId: z.string(),
  username: z.string(),
  providerDisplayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  oauthVerifiedAt: z.string(),
  membership: z.object({
    communityId: z.string(),
    membershipStatus: z.literal('member'),
    nickname: z.string().nullable(),
    roleIds: z.array(z.string()),
    roleNames: z.array(z.string()),
    verifiedAt: z.string(),
  }),
}).openapi('VerifiedDiscordIdentity');

export const verifyDiscordIdentityRoute = createRoute({
  method: 'post',
  path: '/discord/verify',
  responses: {
    200: {
      description: 'Discord account and target guild membership verified',
      content: {
        'application/json': {
          schema: verifiedDiscordIdentitySchema,
        },
      },
    },
    401: {
      description: 'Application or provider authentication is required',
      content: { 'application/json': { schema: errorSchema } },
    },
    409: {
      description: 'Discord account is not linked or does not match the current user',
      content: { 'application/json': { schema: errorSchema } },
    },
    412: {
      description: 'The linked Discord user is not a member of the target guild',
      content: { 'application/json': { schema: errorSchema } },
    },
    502: {
      description: 'Discord could not be reached or returned an invalid response',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

export type VerifiedDiscordIdentity = z.infer<typeof verifiedDiscordIdentitySchema>;
