# Beta

# エンドポイント一覧(WIP)

## 1. REST API 設計原則

- **エンドポイント**: `/api/v1/` をプレフィックスとし、リソース名は複数形（名詞）を使用。
- **ステータスコード**:
    - `200 OK`: 取得・更新成功
    - `201 Created`: 作成成功
    - `204 No Content`: 削除成功
    - `400 Bad Request`: バリデーションエラー
    - `404 Not Found`: リソース不在
- **データ形式**: JSON

---

## 2. エンドポイント定義

### 2.1 ユーザーリソース (`/users`)

ユーザーと、それに紐づくロール情報の同期を管理します。

| **メソッド** | **エンドポイント** | **説明** | **備考** |
| --- | --- | --- | --- |
| **GET** | `/users` | 全ユーザーの一覧取得 | クエリパラメータで `member_id` 検索可 |
| **GET** | `/users/:discord_user_id` | 特定ユーザーの詳細取得 | ロール一覧を `include` |
| **POST** | `/users` | ユーザーの新規作成 | `member_id` との紐付け |
| **PATCH** | `/users/:discord_user_id` | ユーザー基本情報の更新 | 表示名などの変更 |
| **PUT** | `/users/:discord_user_id/roles` | **ロールの同期（一括置換）** | トランザクション処理必須 |
| **DELETE** | `/users/:discord_user_id` | ユーザーデータの削除 | 物理削除または論理削除 |

### 2.2 ロールリソース (`/roles`)

Discordから取得したロールマスタを管理します。

| **メソッド** | **エンドポイント** | **説明** | **備考** |
| --- | --- | --- | --- |
| **GET** | `/roles` | 全ロールの一覧取得 | - |
| **POST** | `/roles` | ロールの新規作成 | Discord同期時に使用 |
| **DELETE** | `/roles/:role_id` | ロールの削除 | ロール消滅時に実行 |

### 2.3 構造・権限リソース (`/categories`, `/channels`)

サーバー階層と「どのロールが見れるか」を管理します。

| **メソッド** | **エンドポイント** | **説明** | **備考** |
| --- | --- | --- | --- |
| **GET** | `/categories` | カテゴリーと所属チャンネルを階層で取得 | - |
| **POST** | `/channels` | チャンネル作成と権限設定 | トランザクション処理必須 |
| **PUT** | `/channels/:channel_id/permissions` | **権限（ロール）の同期** | ロールIDの配列を送信 |
| **PUT** | `/categories/:category_id/permissions` | カテゴリー権限の同期 | - |

---

## 3. リクエスト/レスポンス ペイロード設計（例）

### ユーザーのロール同期 (`PUT /api/v1/users/:id/roles`)

Discord側のロールが変更された際、DB側を完全に一致させるためのエンドポイントです。

**Request Body:**

JSON

`{
  "role_ids": [
    "111222333444",
    "555666777888"
  ]
}`

**Response (200 OK):**

JSON

`{
  "discord_user_id": "123456789",
  "synced_roles_count": 2,
  "updated_at": "2026-01-04T01:50:00Z"
}`

### チャンネルと権限の一括登録 (`POST /api/v1/channels`)

**Request Body:**

JSON

`{
  "channel_id": "999888777",
  "channel_name": "プロジェクトA",
  "category_id": "111222333",
  "allowed_role_ids": [
    "role_id_admin",
    "role_id_member"
  ]
}`