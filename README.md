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

### モックモードで起動

Discord への実接続が不要なら `MOCK_MODE=true` で起動できます。

```sh
supabase start
supabase db reset --local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
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
