# BasicInfrastructureSystem

MCC 基盤システムのモノレポ。

## DiscordConnector

`DiscordConnector` は Cloudflare Workers 向け TypeScript プロジェクトです。
旧 Python/FastAPI/discord.py 実装は Workers の `fetch` handler、Discord REST API、
Hyperdrive + Postgres に置き換えています。

```sh
cd DiscordConnector
pnpm install
pnpm run typecheck
pnpm test
pnpm run dev
```

設定は `DiscordConnector/.env.example` と `DiscordConnector/wrangler.jsonc` を参照してください。
デプロイ前に Hyperdrive binding `HYPERDRIVE` の `id` を実環境の値へ差し替え、
`DISCORD_BOT_TOKEN` などの secret を Wrangler に登録します。

```sh
cd DiscordConnector
pnpm wrangler secret put DISCORD_BOT_TOKEN
pnpm wrangler secret put DISCORD_GUILD_ID
pnpm wrangler secret put SUPABASE_PROJECT_URL
pnpm run deploy
```
