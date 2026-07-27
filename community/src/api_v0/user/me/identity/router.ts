import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppContext } from '../../../../core/types';
import { verifyDiscordIdentityRoute } from './schema';
import { verifyDiscordIdentityService } from './service';

export const userIdentityRouter = new OpenAPIHono<AppContext>()
  .openapi(verifyDiscordIdentityRoute, verifyDiscordIdentityService);
