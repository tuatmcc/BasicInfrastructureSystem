MCC基盤システム向けのDashboardフロントエンドです。

- 認証: Supabase Auth
- 部員情報: MemberDatabase API (`/api/v0/me`, `/api/v0/members`)
- Discord操作: DiscordConnector PublicAPI (`/api/v0/*`)

Dashboardはバックエンドへの直接アクセスではなく、Next.js Route Handler経由で既存APIを呼び出します。

## Environment Variables

`.env.local` に以下を設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
MEMBERDB_API_BASE_URL=
DISCORD_API_BASE_URL=
```

- `MEMBERDB_API_BASE_URL` 例: `http://localhost:8787`
- `DISCORD_API_BASE_URL` 例: `http://localhost:8000`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Pages

- `/` : ログイン / 新規登録
- `/dashboard` : マイページ
- `/dashboard/members` : 部員管理 (管理者)
- `/dashboard/discord` : Discord管理 (管理者)
- `/dashboard/settings` : 設定 (管理者)
