# dbapi 実装方針（現時点案）

このドキュメントは、`requirements.md` の確定事項を実装に落とすための具体案をまとめる。

## 1. 認証方式（確定）

- 認証は Supabase Auth に依存する。
- Supabase Auth は Email/Password に加え、Google などの OAuth プロバイダ認証をサポートする。
- dbapi は受け取った認証情報を前提に Supabase を操作する。

## 2. 初回登録フロー（案）

### 2.1 方針

- 初回サインアップ時に `members` へ行を作成する。
- 作成した行へのアクセスは、RLS により「本人のみ」を基本とする。
- 本人判定キーは `members.member_id` を採用する。
- 初回登録時に発行された `members.member_id` を、ログイン中の認証アカウント `app_metadata.member_id` へ紐付ける。

### 2.2 実装ステップ

1. Supabase Auth でユーザー作成（Email/Password または OAuth）
2. `members` に初期行を作成し、作成された `member_id` を `app_metadata.member_id` に保存
3. `app_metadata.roles` にロール情報を設定
4. RLS で本人アクセスのみ許可（Admin は全件）

## 3. RLS ポリシー（生成方針）

要件から、以下のポリシーは生成可能。

- 一般ユーザー: 自分の `members` 行のみ `SELECT/UPDATE`
- Admin: `members` 全行 `SELECT/UPDATE`
- DiscordConnector: `users` テーブルの `display_name` 更新のみ許可（キーは `discord_user_id`）

### 3.1 生成前提（確定）

- 本人判定キー: `members.member_id`
- DiscordConnector 更新対象: `users.display_name`（`users.discord_user_id` 指定）
- ロール判定キー: `app_metadata.roles`

## 4. エラー仕様（提案）

### 4.1 JSON 形式

```json
{
  "code": 404,
  "message": "Not Found"
}
```

### 4.2 ステータス使い分け

- `400 Bad Request`: 入力不正
- `401 Unauthorized`: 未認証
- `403 Forbidden`: 権限不足
- `404 Not Found`: 対象なし
- `409 Conflict`: 競合（例: 既に `members` 行が存在する状態で `POST /members/me`）

## 5. 監査ログ

- 監査ログは現時点では導入しない。

## 6. API 設計（ページングなし）

- 一覧取得はフィルタ・ソート対応
- ページングは導入しない

想定フィルタ例:

- `grade` の複数指定
- `some_allergy = true`

更新可能範囲:

- 一般ユーザーは自分の `student_id` / `student_email` を更新可能

## 7. 現時点の注意点

- 監査ログを後で導入する場合は、更新系 API へのログ出力方針（DBトリガー or アプリ層）を改めて定義する。

## 8. 現時点で確定した運用ルール

1. `member_id` は `app_metadata.member_id` で管理する。
2. `POST /members/me` の再実行は `409 Conflict` を返す。
3. 一般ユーザーは自分の `student_id` / `student_email` を更新可能。
4. ロール判定は `app_metadata.roles` を用いる。
5. `users` テーブルは DiscordConnector のみ更新可能とし、`member_id` は更新不可。
