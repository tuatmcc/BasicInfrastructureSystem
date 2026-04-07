"""Interface definitions for DiscordDatabaseController."""

from typing import Protocol
from dataclasses import dataclass


@dataclass
class User:
    """User data class."""
    discord_user_id: str
    display_name: str
    member_id: str | None = None
    role_ids: list[str] | None = None


@dataclass
class Role:
    """Role data class."""
    role_id: str
    role_name: str
    permissions: int


@dataclass
class Channel:
    """Channel data class."""
    channel_id: str
    channel_name: str
    category_id: str
    role_ids: list[str] | None = None


@dataclass
class Category:
    """Category data class."""
    category_id: str
    category_name: str
    channels: list[Channel] | None = None
    role_ids: list[str] | None = None


class IDiscordDatabaseController(Protocol):
    """Protocol for Discord database controller."""

    # Lifecycle
    async def connect(self) -> None:
        """Initialize database connection and create tables if needed."""
        ...

    async def disconnect(self) -> None:
        """Close database connection and cleanup resources."""
        ...

    # Context manager support
    async def __aenter__(self) -> "IDiscordDatabaseController":
        ...

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        ...

    # User CRUD
    async def get_users(self, member_id: str | None = None) -> list[User]:
        """Get all users, optionally filtered by member_id."""
        ...

    async def get_user(self, discord_user_id: str) -> User | None:
        """Get a specific user by Discord user ID."""
        ...

    async def create_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User:
        """Create a new user."""
        ...

    async def update_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User | None:
        """Update an existing user. Returns None if user not found."""
        ...

    async def delete_user(self, discord_user_id: str) -> bool:
        """Delete a user. Returns True if deleted, False if not found."""
        ...

    async def sync_user_roles(
        self,
        discord_user_id: str,
        role_ids: list[str],
    ) -> int:
        """Sync user roles (replace all roles with the given list). Returns count of synced roles."""
        ...

    # Role CRUD
    async def get_roles(self) -> list[Role]:
        """Get all roles."""
        ...

    async def get_role(self, role_id: str) -> Role | None:
        """Get a specific role by ID."""
        ...

    async def create_role(
        self,
        role_id: str,
        role_name: str,
        permissions: int,
    ) -> Role:
        """Create a new role."""
        ...

    async def update_role(
        self,
        role_id: str,
        role_name: str | None = None,
        permissions: int | None = None,
    ) -> Role | None:
        """Update an existing role. Returns None if role not found."""
        ...

    async def delete_role(self, role_id: str) -> bool:
        """Delete a role. Returns True if deleted, False if not found."""
        ...

    # Category CRUD
    async def get_categories(self) -> list[Category]:
        """Get all categories with their channels."""
        ...

    async def get_category(self, category_id: str) -> Category | None:
        """Get a specific category by ID."""
        ...

    async def create_category(
        self,
        category_id: str,
        category_name: str,
    ) -> Category:
        """Create a new category."""
        ...

    async def delete_category(self, category_id: str) -> bool:
        """Delete a category. Returns True if deleted, False if not found."""
        ...

    async def sync_category_permissions(
        self,
        category_id: str,
        role_ids: list[str],
    ) -> int:
        """Sync category permissions. Returns count of synced roles."""
        ...

    # Channel CRUD
    async def get_channels(self) -> list[Channel]:
        """Get all channels."""
        ...

    async def get_channel(self, channel_id: str) -> Channel | None:
        """Get a specific channel by ID."""
        ...

    async def create_channel(
        self,
        channel_id: str,
        channel_name: str,
        category_id: str,
        allowed_role_ids: list[str] | None = None,
    ) -> Channel:
        """Create a new channel."""
        ...

    async def delete_channel(self, channel_id: str) -> bool:
        """Delete a channel. Returns True if deleted, False if not found."""
        ...

    async def sync_channel_permissions(
        self,
        channel_id: str,
        role_ids: list[str],
    ) -> int:
        """Sync channel permissions. Returns count of synced roles."""
        ...


class DatabaseError(Exception):
    """Exception raised for database errors."""
    pass
