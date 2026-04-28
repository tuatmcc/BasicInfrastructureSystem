MCC基盤システム向けのDashboardフロントエンドです。

- 認証: Supabase Auth
- 部員情報: MemberDatabase API (`/api/v0/members/me`, `/api/v0/members`)
- Discord操作: DiscordConnector PublicAPI (`/api/v0/*`)

Dashboardはバックエンドへの直接アクセスではなく、Next.js Route Handler経由で既存APIを呼び出します。

新規Authユーザー作成時は Supabase Trigger が `members/users` の初期データを作成します。
ログイン後に `needs_enrollment=true` の場合は `/enrollment` へ遷移し、入部届入力後に `/dashboard` へ遷移します。

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
- `/dashboard/admin` : 管理者コンソール
- `/dashboard/members` : 部員管理 (管理者)
- `/dashboard/discord` : Discord管理 (管理者)
- `/dashboard/settings` : 設定 (管理者)

## 権限管理

- 管理者判定は Dashboard の route handler が Supabase Auth に問い合わせて行います。
- MemberDB の管理系 API は `app_metadata.role` が `admin` のユーザーのみ通過します。
- Supabase Dashboard の SQL Editor か Admin API で、対象ユーザーの `app_metadata.role` を `admin` に設定してください。
