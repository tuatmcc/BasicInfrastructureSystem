# dbapi エンドポイント一覧仕様（v0）

このドキュメントは、`requirements.md` の確定事項に基づく **現時点のエンドポイント一覧** を定義する。

## 共通仕様

- 認証: Supabase Auth
- 認可: Supabase RLS
- ページング: 現時点では未導入
- 詳細スキーマ: `openapi.yaml`

## エンドポイント一覧

| Method | Endpoint | 主な利用者 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/health` | 全体 | ヘルスチェック |
| `POST` | `/members/me` | 一般ユーザー | 初回登録時に自分の `members` 行を作成 |
| `GET` | `/members/me` | 一般ユーザー | 自分の登録情報を取得 |
| `PATCH` | `/members/me` | 一般ユーザー | 自分の登録情報を更新 |
| `GET` | `/members` | Admin | 全ユーザーの登録情報一覧を取得（フィルタ・ソート対応） |
| `GET` | `/members/:member_id` | Admin | 指定ユーザーの登録情報を取得 |
| `PATCH` | `/members/:member_id` | Admin | 指定ユーザーの登録情報を更新 |
| `PATCH` | `/users/:discord_user_id/display-name` | DiscordConnector | Discord 側表示名を `users.display_name` へ反映 |

補足:

- `POST /members/me` は、既に本人の `members` 行が存在する場合 `409 Conflict` を返す。

## フィルタ・ソート（`GET /members`）

### フィルタ

- `grade`: 学年（複数指定可）
- `some_allergy`: アレルギー有無（`true/false`）

### ソート

- `sort_by`: ソート対象列
  - `name`
  - `grade`
  - `updated_at`
- `sort_order`: `asc` / `desc`

## 権限制御要件（RLS 前提）

- 一般ユーザー: 自分の行のみ `SELECT/UPDATE`
- Admin: 全行 `SELECT/UPDATE`
- DiscordConnector: `users` テーブルの `display_name` 更新エンドポイントのみ実行可能
- `users.member_id` は更新不可

## エラー応答

エラー時は以下の形式を返す。

```json
{
  "code": 404,
  "message": "Not Found"
}
```

想定ステータス:

- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

## 監査ログ

- 現時点では導入しない
