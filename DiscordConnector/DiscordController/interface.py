from typing import Protocol

class IDiscordController(Protocol):
    async def connect(self) -> None:
        ...

    async def disconnect(self) -> None:
        ...

    async def create_role(
        self,
        name: str,
        color: tuple[int, int, int] | None = None,
        position: int | None = None,
    ) -> "Role":
        ...

    async def delete_role(self, id: int) -> bool:
        ...

    async def list_roles(self) -> list["Role"]:
        ...

    async def list_role_members(self, role_id: int) -> list["Member"]:
        ...

    async def create_channel(
        self,
        name: str,
        category_id: int | None = None,
        position: int | None = None,
    ) -> "Channel":
        ...

    async def delete_channel(self, id: int) -> bool:
        ...

    async def list_channels(self) -> list["Channel"]:
        ...

    async def list_channel_roles(self, channel_id: int) -> list["Role"]:
        ...

    async def create_category(
        self,
        name: str,
        position: int | None = None,
    ) -> "Category":
        ...

    async def delete_category(self, id: int) -> bool:
        ...

    async def list_categories(self) -> list["Category"]:
        ...

    async def list_members(self) -> list["Member"]:
        ...

    async def list_member_roles(self, member_id: int) -> list["Role"]:
        ...

    async def ban_member(self, id: int) -> bool:
        ...

    async def kick_member(self, id: int) -> bool:
        ...

    async def create_message(self, channel_id: int, content: str) -> "Message":
        ...

    async def delete_message(self, channel_id: int, message_id: int) -> bool:
        ...

    async def total_reactions(
        self,
        channel_id: int,
        message_id: int,
    ) -> list["Reaction"]:
        ...

# こんな感じで上が戻り値の型を指定してほしい、という願望
# 運用によってはふつうにidだけ返すのも検討

# 要　プロパティ追加
class Role:
    def __init__(self, id_: int, name: str, color: tuple[int, int, int], position: int, permissions: int = 0):
        self.id = id_
        self.name = name
        self.color = color
        self.position = position
        self.permissions = permissions

# positionはカテゴリ内での値
class Channel:
    def __init__(self, id_: int, name: str, category_id: int, position: int):
        self.id = id_
        self.name = name
        self.category_id = category_id
        self.position = position

# Discordを踏襲して二重の名前をもたせるべきか？
class Member:
    def __init__(self, id_: int, name: str):
        self.id = id_
        self.name = name

class Category:
    def __init__(self, id_: int, name: str, position: int):
        self.id = id_
        self.name = name
        self.position = position

class Message:
    def __init__(self, id_: int, content: str, author_id: int, channel_id: int):
        self.id = id_
        self.content = content
        self.author_id = author_id
        self.channel_id = channel_id

class Reaction:
    def __init__(self, emoji: str, member_ids: list[int], me: bool, message_id: int):
        self.emoji = emoji
        self.member_ids = member_ids
        self.me = me
        self.message_id = message_id

class DiscordError(Exception):
    pass


class DiscordConnectionError(DiscordError):
    pass
