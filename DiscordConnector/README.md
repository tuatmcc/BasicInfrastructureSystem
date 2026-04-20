# DiscordConnector

Cloudflare Workers deployment of the Discord infrastructure connector.

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run dev
```

`/health` is public. All `/api/v0/...` endpoints require
`Authorization: Bearer <supabase-access-token>`.

## Configuration

Set these as Wrangler secrets or local `.env` values:

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `SUPABASE_PROJECT_URL`

Optional values:

- `DISCORD_LOG_CHANNEL_ID`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWKS_URL`
- `SUPABASE_JWT_AUDIENCE`
- `SUPABASE_JWT_ALGORITHMS`
- `DISCORD_CONNECTOR_ROLE_CLAIM`
- `MOCK_MODE`

Configure a Cloudflare Hyperdrive binding named `HYPERDRIVE` in `wrangler.jsonc`.
The controller expects the existing Postgres tables:

- `users`, `roles`, `categories`, `channels`
- `user_role`, `category_role`, `channel_role`

## Permissions

Supabase access tokens must include DiscordConnector roles at
`app_metadata.discord_connector_roles` by default:

- `viewer`: read endpoints
- `operator`: viewer plus message create/delete
- `admin`: all endpoints

The role claim path can be changed with `DISCORD_CONNECTOR_ROLE_CLAIM`.

## API

The Workers API keeps the previous path shape:

- `GET /health`
- `GET /api/v0/role/list`
- `POST /api/v0/role/create`
- `POST /api/v0/role/delete`
- `GET /api/v0/role/list-members?role_id=...`
- `GET /api/v0/channel/list`
- `POST /api/v0/channel/create`
- `POST /api/v0/channel/delete`
- `GET /api/v0/channel/list-role?channel_id=...`
- `GET /api/v0/category/list`
- `POST /api/v0/category/create`
- `POST /api/v0/category/delete`
- `GET /api/v0/member/list`
- `POST /api/v0/member/ban`
- `POST /api/v0/member/timeout`
- `GET /api/v0/member/list-roles?member_id=...`
- `POST /api/v0/message/create`
- `POST /api/v0/message/delete`
- `GET /api/v0/message/reaction/totalling?channel_id=...&message_id=...`
