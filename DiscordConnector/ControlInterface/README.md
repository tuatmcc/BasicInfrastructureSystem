# ControlInterface - サービス層

Discord Connectorのビジネスロジックを提供するサービス層です。

## 概要

ControlInterfaceは、DiscordControllerとDiscordDatabaseControllerを協調させてビジネスロジックを実行するサービス層を提供します。
実 DB 利用時は `DATABASE_URL` に Supabase(Postgres) の接続先を指定します。

## 構造

```
ControlInterface/
├── services/           # サービス層
│   ├── role_service.py
│   ├── channel_service.py
│   ├── category_service.py
│   ├── member_service.py
│   └── message_service.py
├── dependencies.py     # コントローラーの初期化・取得
└── tests/
```

## 使用方法

```python
from services import RoleService, ChannelService

# コントローラーを取得
from dependencies import get_controller, get_db_controller, lifespan

# サービスを初期化
role_service = RoleService(get_controller(), get_db_controller())

# サービスを利用
role = await role_service.create_role("MyRole", (255, 0, 0), 5)
```

## APIエンドポイント

HTTPエンドポイントは `PublicAPI` モジュールで提供されます。
