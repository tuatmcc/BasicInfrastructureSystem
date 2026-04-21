# DiscordConnector

Discord インフラ連携用コネクタの Cloudflare Workers 実装です。

## 開発

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run dev
```

`/health` は認証なしでアクセスできます。`/api/v0/...` のエンドポイントは
すべて `Authorization: Bearer <supabase-access-token>` が必要です。

## ローカル起動

Worker は Wrangler でローカル起動します。簡単に動作確認する場合は
`.env.example` のサンプル値と `MOCK_MODE=true` を使います。

```sh
cd DiscordConnector
pnpm install
cp .env.example .env
```

`MOCK_MODE=true` でも、Wrangler は `HYPERDRIVE` バインディング用のローカル
接続文字列を要求します。mock controller はこの DB を使わないため、`/health`
やインメモリ mock API の動作確認だけなら、ローカル Postgres 形式の
プレースホルダー URL で十分です。

```sh
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:postgres@127.0.0.1:5432/postgres
pnpm exec wrangler dev --env-file .env --port 8787
```

Worker が起動していることを確認します。

```sh
curl http://localhost:8787/health
# {"status":"ok"}
```

ローカル API テスト時の注意点:

- `MOCK_MODE=true` にすると、Discord 操作と DB 操作はインメモリ controller に
  切り替わります。
- 認証は mock されません。`/api/v0/...` のエンドポイントには、引き続き有効な
  Supabase access token が必要です。
- ローカルで認証付きエンドポイントを呼ぶ場合は、`.env` の
  `SUPABASE_PROJECT_URL` に実際の Supabase project URL を設定し、
  `app_metadata.discord_connector_roles` に `viewer`、`operator`、`admin` の
  いずれかを含む token を使ってください。
- non-mock mode で動かす場合は、実際の `DISCORD_BOT_TOKEN`、
  `DISCORD_GUILD_ID`、および想定 schema を持つローカル Postgres 接続文字列を
  設定してください。

## 設定

次の値を Wrangler secrets またはローカル `.env` に設定します。

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `SUPABASE_PROJECT_URL`

任意の値:

- `DISCORD_LOG_CHANNEL_ID`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWKS_URL`
- `SUPABASE_JWT_AUDIENCE`
- `SUPABASE_JWT_ALGORITHMS`
- `DISCORD_CONNECTOR_ROLE_CLAIM`
- `MOCK_MODE`

`wrangler.jsonc` で `HYPERDRIVE` という名前の Cloudflare Hyperdrive binding を
設定します。controller は次の Postgres table が存在することを前提にしています。

- `users`, `roles`, `categories`, `channels`
- `user_role`, `category_role`, `channel_role`

## 権限

Supabase access token には、デフォルトで
`app_metadata.discord_connector_roles` に DiscordConnector 用 role を含める
必要があります。

- `viewer`: 読み取りエンドポイント
- `operator`: `viewer` に加えて message create/delete
- `admin`: すべてのエンドポイント

role claim のパスは `DISCORD_CONNECTOR_ROLE_CLAIM` で変更できます。

## API

Workers API は従来の path 形式を維持しています。

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
