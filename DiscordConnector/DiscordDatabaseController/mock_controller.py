"""Mock implementation of DiscordDatabaseController for testing."""

from interface import (
    IDiscordDatabaseController,
    User,
    Role,
    Category,
    Channel,
    DatabaseError,
)


class MockDiscordDatabaseController(IDiscordDatabaseController):
    """Mock database controller using in-memory storage."""

    def __init__(self):
        """Initialize mock controller with empty storage."""
        self._users: dict[str, User] = {}
        self._roles: dict[str, Role] = {}
        self._categories: dict[str, Category] = {}
        self._channels: dict[str, Channel] = {}
        self._user_roles: dict[str, list[str]] = {}  # user_id -> [role_id]
        self._category_roles: dict[str, list[str]] = {}  # category_id -> [role_id]
        self._channel_roles: dict[str, list[str]] = {}  # channel_id -> [role_id]
        self._connected = False

    async def connect(self) -> None:
        """Mark as connected."""
        self._connected = True

    async def disconnect(self) -> None:
        """Mark as disconnected."""
        self._connected = False

    async def __aenter__(self) -> "MockDiscordDatabaseController":
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.disconnect()

    def _check_connected(self) -> None:
        if not self._connected:
            raise RuntimeError("Mock database not connected. Call connect() first.")

    # User CRUD
    async def get_users(self, member_id: str | None = None) -> list[User]:
        self._check_connected()
        users = list(self._users.values())
        if member_id:
            users = [u for u in users if u.member_id == member_id]
        # Update role_ids
        for user in users:
            user.role_ids = self._user_roles.get(user.discord_user_id, [])
        return users

    async def get_user(self, discord_user_id: str) -> User | None:
        self._check_connected()
        user = self._users.get(discord_user_id)
        if user:
            user.role_ids = self._user_roles.get(discord_user_id, [])
        return user

    async def create_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User:
        self._check_connected()
        if discord_user_id in self._users:
            raise DatabaseError(f"User {discord_user_id} already exists")

        user = User(
            discord_user_id=discord_user_id,
            display_name=display_name,
            member_id=member_id,
        )
        self._users[discord_user_id] = user
        return user

    async def update_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User | None:
        self._check_connected()
        if discord_user_id not in self._users:
            return None

        user = User(
            discord_user_id=discord_user_id,
            display_name=display_name,
            member_id=member_id,
            role_ids=self._user_roles.get(discord_user_id, []),
        )
        self._users[discord_user_id] = user
        return user

    async def delete_user(self, discord_user_id: str) -> bool:
        self._check_connected()
        if discord_user_id not in self._users:
            return False

        del self._users[discord_user_id]
        self._user_roles.pop(discord_user_id, None)
        return True

    async def sync_user_roles(
        self,
        discord_user_id: str,
        role_ids: list[str],
    ) -> int:
        self._check_connected()
        if discord_user_id not in self._users:
            raise DatabaseError(f"User {discord_user_id} not found")

        # Only keep roles that exist
        valid_role_ids = [r for r in role_ids if r in self._roles]
        self._user_roles[discord_user_id] = valid_role_ids
        return len(valid_role_ids)

    # Role CRUD
    async def get_roles(self) -> list[Role]:
        self._check_connected()
        return list(self._roles.values())

    async def get_role(self, role_id: str) -> Role | None:
        self._check_connected()
        return self._roles.get(role_id)

    async def create_role(
        self,
        role_id: str,
        role_name: str,
        permissions: int,
    ) -> Role:
        self._check_connected()
        role = Role(
            role_id=role_id,
            role_name=role_name,
            permissions=permissions,
        )
        self._roles[role_id] = role
        return role

    async def update_role(
        self,
        role_id: str,
        role_name: str | None = None,
        permissions: int | None = None,
    ) -> Role | None:
        self._check_connected()
        if role_id not in self._roles:
            return None

        existing = self._roles[role_id]
        role = Role(
            role_id=role_id,
            role_name=role_name if role_name is not None else existing.role_name,
            permissions=permissions if permissions is not None else existing.permissions,
        )
        self._roles[role_id] = role
        return role

    async def delete_role(self, role_id: str) -> bool:
        self._check_connected()
        if role_id not in self._roles:
            return False

        del self._roles[role_id]
        # Remove role from all associations
        for uid in self._user_roles:
            self._user_roles[uid] = [r for r in self._user_roles[uid] if r != role_id]
        for cid in self._category_roles:
            self._category_roles[cid] = [r for r in self._category_roles[cid] if r != role_id]
        for chid in self._channel_roles:
            self._channel_roles[chid] = [r for r in self._channel_roles[chid] if r != role_id]
        return True

    # Category CRUD
    async def get_categories(self) -> list[Category]:
        self._check_connected()
        categories = []
        for cat in self._categories.values():
            channels = [
                Channel(
                    channel_id=ch.channel_id,
                    channel_name=ch.channel_name,
                    category_id=ch.category_id,
                    role_ids=self._channel_roles.get(ch.channel_id, []),
                )
                for ch in self._channels.values()
                if ch.category_id == cat.category_id
            ]
            categories.append(Category(
                category_id=cat.category_id,
                category_name=cat.category_name,
                channels=channels,
                role_ids=self._category_roles.get(cat.category_id, []),
            ))
        return categories

    async def get_category(self, category_id: str) -> Category | None:
        self._check_connected()
        cat = self._categories.get(category_id)
        if not cat:
            return None

        channels = [
            Channel(
                channel_id=ch.channel_id,
                channel_name=ch.channel_name,
                category_id=ch.category_id,
                role_ids=self._channel_roles.get(ch.channel_id, []),
            )
            for ch in self._channels.values()
            if ch.category_id == category_id
        ]
        return Category(
            category_id=cat.category_id,
            category_name=cat.category_name,
            channels=channels,
            role_ids=self._category_roles.get(category_id, []),
        )

    async def create_category(
        self,
        category_id: str,
        category_name: str,
    ) -> Category:
        self._check_connected()
        category = Category(
            category_id=category_id,
            category_name=category_name,
        )
        self._categories[category_id] = category
        return category

    async def delete_category(self, category_id: str) -> bool:
        self._check_connected()
        if category_id not in self._categories:
            return False

        del self._categories[category_id]
        self._category_roles.pop(category_id, None)
        # Delete channels in this category
        channels_to_delete = [
            ch.channel_id for ch in self._channels.values()
            if ch.category_id == category_id
        ]
        for ch_id in channels_to_delete:
            del self._channels[ch_id]
            self._channel_roles.pop(ch_id, None)
        return True

    async def sync_category_permissions(
        self,
        category_id: str,
        role_ids: list[str],
    ) -> int:
        self._check_connected()
        if category_id not in self._categories:
            raise DatabaseError(f"Category {category_id} not found")

        valid_role_ids = [r for r in role_ids if r in self._roles]
        self._category_roles[category_id] = valid_role_ids
        return len(valid_role_ids)

    # Channel CRUD
    async def get_channels(self) -> list[Channel]:
        self._check_connected()
        channels = []
        for ch in self._channels.values():
            channels.append(Channel(
                channel_id=ch.channel_id,
                channel_name=ch.channel_name,
                category_id=ch.category_id,
                role_ids=self._channel_roles.get(ch.channel_id, []),
            ))
        return channels

    async def get_channel(self, channel_id: str) -> Channel | None:
        self._check_connected()
        ch = self._channels.get(channel_id)
        if not ch:
            return None
        return Channel(
            channel_id=ch.channel_id,
            channel_name=ch.channel_name,
            category_id=ch.category_id,
            role_ids=self._channel_roles.get(channel_id, []),
        )

    async def create_channel(
        self,
        channel_id: str,
        channel_name: str,
        category_id: str,
        allowed_role_ids: list[str] | None = None,
    ) -> Channel:
        self._check_connected()
        if category_id not in self._categories:
            raise DatabaseError(f"Category {category_id} not found")

        channel = Channel(
            channel_id=channel_id,
            channel_name=channel_name,
            category_id=category_id,
        )
        self._channels[channel_id] = channel

        if allowed_role_ids:
            valid_role_ids = [r for r in allowed_role_ids if r in self._roles]
            self._channel_roles[channel_id] = valid_role_ids

        return channel

    async def delete_channel(self, channel_id: str) -> bool:
        self._check_connected()
        if channel_id not in self._channels:
            return False

        del self._channels[channel_id]
        self._channel_roles.pop(channel_id, None)
        return True

    async def sync_channel_permissions(
        self,
        channel_id: str,
        role_ids: list[str],
    ) -> int:
        self._check_connected()
        if channel_id not in self._channels:
            raise DatabaseError(f"Channel {channel_id} not found")

        valid_role_ids = [r for r in role_ids if r in self._roles]
        self._channel_roles[channel_id] = valid_role_ids
        return len(valid_role_ids)
