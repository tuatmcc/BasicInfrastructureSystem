# BasicInfrastructureSystem
MCC基盤システムのモノレポ

## 操作用インターフェース

起ち上げ
```sh
uv sync
supabase start
supabase db reset --local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
cd DiscordConnector/ControlInterface
uv run uvicorn main:app --reload
# モックモード
# MOCK_MODE=true uv run uvicorn main:app --reload
```

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
