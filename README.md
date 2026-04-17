# BasicInfrastructureSystem
MCC基盤システムのモノレポ

## DiscordConnector の立ち上げ

DiscordConnector は `PublicAPI` を起動すると、内部で `ControlInterface` と
`DiscordController` / `DiscordDatabaseController` も初期化されます。
このうち Discord への実接続は startup 時には行わず、`role/create` など
Discord 操作を実行するたびに接続して切断します。

### 依存関係のインストール

```sh
uv sync --all-packages
```

### 実 Discord を使って起動

`DiscordConnector/.env` に最低限以下を設定します。

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_LOG_CHANNEL_ID` (DB 更新ログの送信先。未設定時は通知無効で warning を出します)
- `SUPABASE_PROJECT_URL` (`PublicAPI` が Supabase Auth JWT を JWKS で検証するために使用)

DB も使うため、Supabase ローカル環境を起動して `DATABASE_URL` を設定します。

```sh
cp DiscordConnector/.env.example DiscordConnector/.env
supabase start
supabase db reset --local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
cd DiscordConnector/PublicAPI
uv run uvicorn main:app --reload
```

起動後は `http://127.0.0.1:8000/health` で疎通確認できます。
この時点では Discord Gateway には未接続で、各 API 操作時に接続されます。
Discord Developer Portal では `Server Members Intent` を有効化してください。
この実装では `Message Content Intent` と `Presence Intent` は不要です。

`/health` を除く `PublicAPI` の全エンドポイントは `Authorization: Bearer <jwt>` が必須です。
JWT はこのリポジトリでは発行せず、Supabase Auth が発行します。`PublicAPI` は
Supabase JWKS 公開鍵で署名検証し、`app_metadata.discord_connector_roles` クレームの
`viewer` / `operator` / `admin` を使って RBAC を適用します。

### Supabase Auth の権限付与

`PublicAPI` の権限は Supabase Auth ユーザーの `app_metadata.discord_connector_roles`
に配列で設定します。Supabase の `user_metadata` はユーザー自身が更新できる構成に
なり得るため、権限管理には使わないでください。

設定例:

```json
{
  "discord_connector_roles": ["admin"]
}
```

Supabase Dashboard から設定する場合:

1. Supabase Dashboard で対象プロジェクトを開く
2. `Authentication` -> `Users` を開く
3. 対象ユーザーを選択する
4. `Raw App Meta Data` に `discord_connector_roles` を追加する
5. ユーザーに再ログインさせ、access token に新しい `app_metadata` を反映させる

サーバー側コードから設定する場合は、`service_role` key を使って
Supabase Admin API で `app_metadata` を更新します。`service_role` key はブラウザや
クライアントアプリに置かず、必ずサーバー側だけで扱ってください。

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: {
    discord_connector_roles: ["viewer", "operator"],
  },
});
```

権限の意味:

- `viewer`: GET 系の読み取りエンドポイント
- `operator`: `viewer` に加えてメッセージ作成・削除
- `admin`: 全操作

ローカル Supabase Auth で試す場合:

```sh
supabase start

# supabase start の出力から anon key と service_role key を控える
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_ANON_KEY='<supabase start に表示される anon key>'
export SUPABASE_SERVICE_ROLE_KEY='<supabase start に表示される service_role key>'

# テストユーザーを作成
curl -s "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"discord-admin@example.local","password":"password123"}'

# ユーザーIDを控えて app_metadata に PublicAPI 権限を付与
export SUPABASE_USER_ID='<signup レスポンスの user.id>'
curl -s -X PUT "$SUPABASE_URL/auth/v1/admin/users/$SUPABASE_USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"app_metadata":{"discord_connector_roles":["admin"]}}'

# 再ログインして app_metadata 反映済みの access_token を取得
curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"discord-admin@example.local","password":"password123"}'
```

`PublicAPI` をローカル Supabase Auth に向ける場合は以下を設定します。

```sh
export SUPABASE_PROJECT_URL=http://127.0.0.1:54321
```

現在の `PublicAPI` は JWKS による非対称鍵検証を前提にしています。ローカル Supabase の
JWKS が空、または access token が HS256 の場合は検証できません。手元の環境で確認するには:

```sh
curl "$SUPABASE_URL/auth/v1/.well-known/jwks.json"
```

`keys` が空の場合、手動E2E確認には非対称 signing key を有効化した Supabase 環境か、
リモートSupabaseプロジェクトを使ってください。リポジトリ内の `PublicAPI` 単体テストは、
テスト用JWKSを差し込むためローカルSupabase Authには依存しません。

### モックモードで起動

Discord への実接続が不要なら `MOCK_MODE=true` で起動できます。

```sh
supabase start
supabase db reset --local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
export SUPABASE_PROJECT_URL=https://your-project-ref.supabase.co
cd DiscordConnector/PublicAPI
MOCK_MODE=true uv run uvicorn main:app --reload
```

### 補足

`ControlInterface` はサービス層で、単独で起動するエントリポイントはありません。
そのため、操作用インターフェースとして別途 `ControlInterface` の起動手順を README に書く必要はありません。

## テスト実行

### 依存関係のインストール
```sh
uv sync --all-packages --extra test
```

### 全テスト実行
```sh
supabase start
supabase db reset --local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres

# 統合テスト（MockDiscordController → API → DB）
uv run pytest DiscordConnector/tests -v

# ControlInterface テスト（単体 + 結合）
uv run pytest DiscordConnector/ControlInterface/tests -v

# DiscordDatabaseController 単体テスト
uv run pytest DiscordConnector/DiscordDatabaseController/tests -v
```

### 個別テスト実行
```sh
supabase db reset --local

# 結合テストのみ（API ↔ DB）
uv run pytest DiscordConnector/ControlInterface/tests/test_db_integration.py -v

# 特定のテストクラス
uv run pytest DiscordConnector/tests/test_integration.py::TestRoleLifecycle -v

# 特定のテスト
uv run pytest DiscordConnector/tests/test_integration.py::TestRoleLifecycle::test_create_role_syncs_to_db -v
```

### テスト構成

| テストスイート | 場所 | 内容 |
|--------------|------|------|
| 統合テスト | `DiscordConnector/tests/` | Discord→API→Supabase(Postgres) 全体フロー |
| 結合テスト | `ControlInterface/tests/test_db_integration.py` | API↔Supabase(Postgres) 連携 |
| ControlInterface単体 | `ControlInterface/tests/test_*.py` | APIエンドポイント |
| DB単体 | `DiscordDatabaseController/tests/` | DBコントローラー |

## Supabase ローカル開発

DB を使う実行系とテストは `supabase cli` で起動したローカル Postgres を前提にしています。

```sh
supabase start
supabase db reset --local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
```

スキーマ定義は [supabase/migrations/20260410000000_init_discord_connector.sql](/home/nixos/myProjects/BasicInfrastructureSystem/supabase/migrations/20260410000000_init_discord_connector.sql) で管理します。
