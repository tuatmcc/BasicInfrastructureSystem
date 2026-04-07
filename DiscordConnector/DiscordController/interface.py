from typing import Protocol

class IDiscordController(Protocol):
    pass

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
