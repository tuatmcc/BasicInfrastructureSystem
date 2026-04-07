# DiscordDatabaseController

Discord サーバーの状態を管理するためのデータベースコントローラー。

## 概要

DiscordDatabaseController は、Discord サーバーのユーザー、ロール、カテゴリー、チャンネル情報を SQLite データベースで管理するコンポーネントです。DiscordController と同様のアーキテクチャ（Protocol ベースのインターフェース）で設計されています。

## アーキテクチャ

```
ControlInterface
    └── dependencies.py
            ├── get_controller()      → IDiscordController (Discord Bot操作)
            └── get_db_controller()   → IDiscordDatabaseController (DB操作)
```

## ファイル構成

| ファイル | 説明 |
|---------|------|
| `interface.py` | `IDiscordDatabaseController` Protocol と データクラス定義 |
| `controller.py` | SQLite を使用した実装 |
| `mock_controller.py` | テスト用のインメモリモック実装 |
| `database.py` | SQLAlchemy async engine 設定 |
| `models.py` | ORM モデル定義 |
| `schemas.py` | Pydantic スキーマ |

## 使用方法

### ControlInterface からの使用

```python
from dependencies import get_db_controller

# ルーター内で使用
@router.get("/users")
async def list_users():
    db = get_db_controller()
    users = await db.get_users()
    return users
```

### 直接使用

```python
from controller import DiscordDatabaseController

async with DiscordDatabaseController("sqlite+aiosqlite:///./discord.db") as db:
    # ユーザー操作
    user = await db.create_user("123456789", "TestUser", "M001")
    users = await db.get_users()
    
    # ロール操作
    role = await db.create_role("role_1", "Admin", 8)
    await db.sync_user_roles("123456789", ["role_1"])
    
    # カテゴリー/チャンネル操作
    category = await db.create_category("cat_1", "General")
    channel = await db.create_channel("ch_1", "chat", "cat_1")
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `DATABASE_URL` | データベース接続URL | `sqlite+aiosqlite:///./discord.db` |
| `MOCK_MODE` | モックモードの有効化 | `false` |

## データモデル

### User
- `discord_user_id`: Discord ユーザー ID (主キー)
- `display_name`: 表示名
- `member_id`: 部員 ID (オプション)
- `roles`: 関連付けられたロール (多対多)

### Role
- `role_id`: ロール ID (主キー)
- `role_name`: ロール名
- `permissions`: 権限ビットマスク

### Category
- `category_id`: カテゴリー ID (主キー)
- `category_name`: カテゴリー名
- `channels`: 所属チャンネル (1対多)
- `roles`: アクセス可能なロール (多対多)

### Channel
- `channel_id`: チャンネル ID (主キー)
- `channel_name`: チャンネル名
- `category_id`: 所属カテゴリー ID (外部キー)
- `roles`: アクセス可能なロール (多対多)

## 依存関係

- `sqlalchemy>=2.0.0`
- `aiosqlite>=0.20.0`
- `pydantic>=2.0.0`
