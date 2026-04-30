# MemberDatabase 抽象化 REST API 要件定義（確定事項のみ）

## 1. 目的

- MemberDatabase の DB 本体は Supabase で実装されているため、Supabase への直接依存を外部利用者に露出しないよう、操作を抽象化した REST API を提供する。

## 2. 前提・制約

- テーブル操作の権限管理は Supabase 側の RLS（Row Level Security）に依存する。
- 実装言語は TypeScript とし、Cloudflare Workers へのデプロイを考慮する。
- 認証は Supabase Auth に依存し、dbapi は Supabase Auth の認証情報を用いて Supabase を操作する。

## 3. 権限モデル（現時点で確定しているもの）

### 3.0 採用方式

- ロール管理方式は `app_metadata` 方式を採用する。
- ロールは以下の3種類とする。
  - `Admin`
  - `一般ユーザー`
  - `DiscordConnector`

### 3.1 DiscordConnector 専用処理

- 「ユーザーの表示名変更（Discord の表示名を DB に反映）」は DiscordConnector のみが行う前提とする。
- 反映先は `users.display_name` とし、対象行は `users.discord_user_id` で指定する。
- 当該操作は、DiscordConnector 用ロールを持つアカウントが認証を通過した場合にのみ有効とする。

### 3.2 登録情報更新

- 管理者（Admin）は全ユーザーの登録情報を操作できる。
- 一般ユーザーは RLS により、自分のデータが格納された行のみ操作できる。

### 3.3 登録情報表示

- 管理者（Admin）は全ユーザーの登録情報にアクセスできる。
- 一般ユーザーは RLS により、自分のデータが格納された行のみアクセスできる。

## 4. 操作対象データ（確定）

`members` テーブルの以下カラムを dbapi の操作対象とする。

- `name`
- `grade`
- `emergency_contact`
- `student_id`
- `student_email`
- `insurance`
- `some_allergy`

### 4.1 本人判定キー

- 一般ユーザーの本人判定は `members.member_id` を用いる。
- 初回登録時に作成された `members.member_id`（UUID）を、ログイン中アカウントの `app_metadata.member_id` に紐付ける。

### 4.2 DiscordConnector 操作対象（表示名反映）

- `users.discord_user_id` をキーとして、`users.display_name` を更新する。
- `users.member_id` は変更不可とする。

## 5. API 設計方針

- 現在フロントエンド（Dashboard）で必要と見込まれる機能を起点にしつつ、実装時は機能単位で直接 1:1 に対応させず、将来の拡張性を考慮して API を適切に分割する。
- 一覧取得ではフィルタ・ソートを提供する。
- ページングは現時点では導入しない（想定件数を考慮）。
- `POST /members/me` を既存ユーザーが再実行した場合は `409 Conflict` とする。
- 一般ユーザーは自分の `student_id` / `student_email` を編集可能とする。

## 5.1 ロール判定キー（確定）

- ロール判定には `app_metadata.roles` を用いる。
- `app_metadata.roles` は以下ロール名を含む配列とする。
  - `Admin`
  - `一般ユーザー`
  - `DiscordConnector`

## 6. 対象操作（確定済み）

本要件で対象とする操作カテゴリは以下の3つ。

1. DiscordConnector 経由の表示名反映
2. ユーザー登録情報の更新
3. ユーザー登録情報の表示

---

※ 本ドキュメントには、未確定事項（エンドポイントの具体命名、入出力スキーマ詳細、エラー仕様、追加機能案）は記載しない。
