# dbapi 統合仕様（実装開始版）

`docs/dbapi` 配下の仕様を、実装開始に必要な最小単位で統合したドキュメント。

## 1. 仕様の正本

- API 契約（Path / Method / Request / Response）: `openapi.yaml`
- 要件（役割・制約・設計方針）: `requirements.md`
- Supabase 側作業: `supabase.md`
- 実装方針: `implement.md`

## 2. 今回確定した重要事項

1. 本人判定キー
   - `members.member_id`
   - 初回登録時に発行された UUID を `app_metadata.member_id` に紐付ける

2. ロール判定
   - `app_metadata.roles` を使用
   - ロール値: `Admin` / `一般ユーザー` / `DiscordConnector`

3. Discord 表示名反映
   - 更新先: `users.display_name`
   - 行指定: `users.discord_user_id`
   - `users.member_id` は更新不可

4. `POST /members/me`
   - 成功時: `204 No Content`
   - 既存行あり: `409 Conflict`

5. 監査ログ
   - 現時点では導入しない

## 3. エンドポイント一覧（抜粋）

- `GET /health`
- `POST /members/me`
- `GET /members/me`
- `PATCH /members/me`
- `GET /members`
- `GET /members/{member_id}`
- `PATCH /members/{member_id}`
- `PATCH /users/{discord_user_id}/display-name`

※ 完全定義は `openapi.yaml` を参照。

## 4. 実装優先順

1. `/health`
2. 認証ミドルウェア（Bearer 受理、未認証 401）
3. `/members/me`（POST/GET/PATCH）
4. Admin 向け `/members` 系
5. DiscordConnector 向け `/users/{discord_user_id}/display-name`
