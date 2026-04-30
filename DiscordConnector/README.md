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
接続文字列を要求します。Supabase CLI の `supabase start` でローカル Supabase
を起動している場合、Postgres は通常 `127.0.0.1:54322` で待ち受けます。
Wrangler には `SUPABASE_PROJECT_URL` とは別に、この Postgres 接続文字列を
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` として渡します。

```sh
supabase start
cd DiscordConnector
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
SSL_CERT_DIR=/etc/ssl/certs \
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt \
pnpm exec wrangler dev --env-file .env --port 8787
```

`SUPABASE_PROJECT_URL` は Supabase Auth/API 用の URL です。ローカル Supabase
では通常 `http://127.0.0.1:54321` を設定します。一方、
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` は Hyperdrive が
ローカルで接続する Postgres 用の URL です。

NixOS などで `workerd` が `TLS peer's certificate is not trusted` または
`unable to get local issuer certificate` を出す場合は、上記のように
`SSL_CERT_FILE`、`SSL_CERT_DIR`、`NODE_EXTRA_CA_CERTS` を指定して Wrangler を
再起動します。既に起動中の `wrangler dev` には後から環境変数を設定しても
反映されません。

mock controller はこの DB を使わないため、`/health` やインメモリ mock API の
動作確認だけなら、ローカル Postgres 形式のプレースホルダー URL でも十分です。

```sh
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:postgres@127.0.0.1:5432/postgres
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
SSL_CERT_DIR=/etc/ssl/certs \
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt \
pnpm exec wrangler dev --env-file .env --port 8787
```

Worker が起動していることを確認します。

```sh
curl http://localhost:8787/health
# {"status":"ok"}
```

OpenAPI ドキュメントもローカル Worker から確認できます。

- `http://localhost:8787/docs`: Swagger UI
- `http://localhost:8787/openapi.json`: OpenAPI JSON

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

### ローカル Supabase の access token 取得

ローカル Supabase で認証付き API を試す場合は、`supabase status` の
`Project URL` と `Publishable` key を使って Supabase Auth にログインします。
CLI のバージョンによっては `anon key` ではなく `Publishable` と表示されます。

```sh
supabase status
```

表示例:

```txt
Project URL  http://127.0.0.1:54321
Publishable  sb_publishable_...
Secret       sb_secret_...
```

`Secret` は service/admin 用です。ブラウザやフロントエンドには出さず、ローカル
手元作業やサーバー側スクリプトでのみ使ってください。通常の signup/login には
`Publishable` key を使います。

```sh
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=sb_publishable_...
```

テストユーザーが未作成の場合は signup します。

```sh
curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"local@example.com","password":"password123"}'
```

DiscordConnector 用の権限は Supabase Auth ユーザーの
`app_metadata.discord_connector_roles` に設定します。ローカルでは Studio
`http://127.0.0.1:54323` の SQL Editor、または `psql` から直接更新できます。

```sh
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
```

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"discord_connector_roles":["admin"]}'::jsonb
where email = 'local@example.com';
```

`admin` の代わりに、読み取りのみなら `viewer`、message create/delete までなら
`operator` を設定します。

権限を設定したあとにログインし、`access_token` を取得します。権限 claim は token
発行時に入るため、権限変更前に取得した token はログインし直してください。

```sh
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"local@example.com","password":"password123"}'
```

レスポンスの `access_token` を `Authorization: Bearer` ヘッダーで渡します。

```sh
curl http://localhost:8787/api/v0/role/list \
  -H "Authorization: Bearer <access_token>"
```

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
