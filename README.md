# BasicInfrastructureSystem
MCC基盤システムのモノレポ

## 操作用インターフェース

起ち上げ
```sh
uv sync
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
# 統合テスト（MockDiscordController → API → DB）
uv run pytest DiscordConnector/tests -v

# ControlInterface テスト（単体 + 結合）
uv run pytest DiscordConnector/ControlInterface/tests -v

# DiscordDatabaseController 単体テスト
uv run pytest DiscordConnector/DiscordDatabaseController/tests -v
```

### 個別テスト実行
```sh
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
| 統合テスト | `DiscordConnector/tests/` | Discord→API→DB全体フロー |
| 結合テスト | `ControlInterface/tests/test_db_integration.py` | API↔DB連携 |
| ControlInterface単体 | `ControlInterface/tests/test_*.py` | APIエンドポイント |
| DB単体 | `DiscordDatabaseController/tests/` | DBコントローラー |