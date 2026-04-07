"""Mock implementation of DiscordController for testing without Discord credentials."""

import logging
from interface import (
    IDiscordController,
    Role,
    Channel,
    Member,
    Category,
    Message,
    Reaction,
)

logger = logging.getLogger(__name__)


class MockDiscordController(IDiscordController):
    """Mock Discord controller that returns dummy data for API testing."""

    def __init__(self):
        self.guild = None
        self._connected = False
        self._id_counter = 1000
        logger.info("MockDiscordController initialized")

    def _next_id(self) -> int:
        """Generate a unique ID for mock objects."""
        self._id_counter += 1
        return self._id_counter

    async def connect(self) -> None:
        logger.info("Mock: Connecting to Discord (simulated)")
        self._connected = True

    async def disconnect(self) -> None:
        logger.info("Mock: Disconnecting from Discord (simulated)")
        self._connected = False

    async def __aenter__(self):
        await self.connect()
        await self.set_guild()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.disconnect()

    async def set_guild(self) -> None:
        logger.info("Mock: Setting guild (simulated)")
        self.guild = "MockGuild"

    async def hello_no_dec(self, ch_name: str) -> None:
        logger.info(f"Mock: hello_no_dec called with channel: {ch_name}")

    async def create_role(
        self,
        name: str,
        color: tuple[int, int, int] | None = None,
        position: int | None = None,
    ) -> Role:
        logger.info(f"Mock: Creating role '{name}'")
        return Role(
            id_=self._next_id(),
            name=name,
            color=color or (0, 0, 0),
            position=position or 1,
            permissions=0,
        )

    async def delete_role(self, id: int) -> bool:
        logger.info(f"Mock: Deleting role {id}")
        return True

    async def list_roles(self) -> list[Role]:
        logger.info("Mock: Listing roles")
        return [
            Role(id_=100, name="Admin", color=(255, 0, 0), position=10, permissions=8),
            Role(id_=101, name="Moderator", color=(0, 255, 0), position=5, permissions=4),
            Role(id_=102, name="Member", color=(0, 0, 255), position=1, permissions=0),
        ]

    async def list_role_members(self, role_id: int) -> list[Member]:
        logger.info(f"Mock: Listing members for role {role_id}")
        return [
            Member(id_=200, name="TestUser1"),
            Member(id_=201, name="TestUser2"),
        ]

    async def create_channel(
        self,
        name: str,
        category_id: int | None = None,
        position: int | None = None,
    ) -> Channel:
        logger.info(f"Mock: Creating channel '{name}'")
        return Channel(
            id_=self._next_id(),
            name=name,
            category_id=category_id or 0,
            position=position or 1,
        )

    async def delete_channel(self, id: int) -> bool:
        logger.info(f"Mock: Deleting channel {id}")
        return True

    async def list_channels(self) -> list[Channel]:
        logger.info("Mock: Listing channels")
        return [
            Channel(id_=300, name="general", category_id=400, position=1),
            Channel(id_=301, name="random", category_id=400, position=2),
            Channel(id_=302, name="announcements", category_id=401, position=1),
        ]

    async def list_channel_roles(self, channel_id: int) -> list[Role]:
        logger.info(f"Mock: Listing roles for channel {channel_id}")
        return [
            Role(id_=100, name="Admin", color=(255, 0, 0), position=10, permissions=8),
        ]

    async def create_category(
        self, name: str, position: int | None = None
    ) -> Category:
        logger.info(f"Mock: Creating category '{name}'")
        return Category(
            id_=self._next_id(),
            name=name,
            position=position or 1,
        )

    async def delete_category(self, id: int) -> bool:
        logger.info(f"Mock: Deleting category {id}")
        return True

    async def list_categories(self) -> list[Category]:
        logger.info("Mock: Listing categories")
        return [
            Category(id_=400, name="Text Channels", position=1),
            Category(id_=401, name="Voice Channels", position=2),
        ]

    async def list_members(self) -> list[Member]:
        logger.info("Mock: Listing members")
        return [
            Member(id_=200, name="TestUser1"),
            Member(id_=201, name="TestUser2"),
            Member(id_=202, name="TestUser3"),
        ]

    async def list_member_roles(self, member_id: int) -> list[Role]:
        logger.info(f"Mock: Listing roles for member {member_id}")
        return [
            Role(id_=102, name="Member", color=(0, 0, 255), position=1, permissions=0),
        ]

    async def ban_member(self, id: int) -> bool:
        logger.info(f"Mock: Banning member {id}")
        return True

    async def kick_member(self, id: int) -> bool:
        logger.info(f"Mock: Kicking member {id}")
        return True

    async def create_message(self, channel_id: int, content: str) -> Message:
        logger.info(f"Mock: Creating message in channel {channel_id}")
        return Message(
            id_=self._next_id(),
            content=content,
            author_id=999,  # Bot's mock ID
            channel_id=channel_id,
        )

    async def delete_message(self, channel_id: int, message_id: int) -> bool:
        logger.info(f"Mock: Deleting message {message_id} from channel {channel_id}")
        return True

    async def total_reactions(
        self, channel_id: int, message_id: int
    ) -> list[Reaction]:
        logger.info(f"Mock: Getting reactions for message {message_id}")
        return [
            Reaction(emoji="👍", member_ids=[200, 201], me=False, message_id=message_id),
            Reaction(emoji="❤️", member_ids=[202], me=True, message_id=message_id),
        ]
