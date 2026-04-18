# Dashboard (Frontend)

`docs/dbapi/openapi.yaml` と `docs/frondend/*.md` を基に作成した Next.js フロントエンドです。

## セットアップ

```bash
cd dashboard
npm install
cp ../.env.example ../.env
npm run dev
```

## 環境変数

- `DBAPI_BASE_URL`
  - dbapi のベースURL（例: `http://127.0.0.1:8787`）

※ すべてモノレポ直下 `.env` から読み込みます。

## 実装済みページ

- `/login`
  - dbapi 経由のログイン/新規登録（Email/Password + Google OAuth）
- `/dashboard`
  - 一般ユーザー向け: `GET/POST/PATCH /members/me`
- `/dashboard/members`
  - Admin向け: `GET /members`, `PATCH /members/{member_id}`
- `/dashboard/discord`
  - dbapi範囲のDiscord連携: `PATCH /users/{discord_user_id}/display-name`
- `/dashboard/settings`
  - API接続設定（health check）

## 認証

- Dashboard は Supabase に直接接続せず、`dbapi` 経由で認証を実行
- `POST /auth/login`, `POST /auth/signup`, `GET /auth/google/start`, `POST /auth/logout` を利用
- 取得したアクセストークンを dbapi の `Authorization: Bearer` に利用
- `/` は常に `/login` へ遷移し、未認証で `/dashboard/*` へアクセスした場合も `/login` へリダイレクト

## 新規登録フロー（dbapi仕様準拠）

1. `/login` で Supabase Auth 新規登録（Email/Password）または Google ログイン
2. ログイン後 `/dashboard` で `POST /members/me` を実行して初回登録
3. `POST /members/me` が `204` の後、`app_metadata.member_id` をJWTへ反映するため再ログイン
4. 再ログイン後 `GET /members/me` でプロフィール取得

`POST /members/me` を再実行すると `409 Conflict` になるため、画面側で説明メッセージを表示する。

## 注意

- Discordのロール/チャンネル操作は dbapi では未提供のため、現実装は対象外。
