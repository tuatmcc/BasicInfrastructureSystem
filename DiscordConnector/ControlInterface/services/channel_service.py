"""Channel service - business logic for channel operations."""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ChannelData:
    """Domain object for channel."""
    id: int
    name: str
    category_id: int
    position: int


@dataclass
class RoleData:
    """Domain object for role (minimal)."""
    id: int
    name: str
    color: tuple[int, int, int]
    position: int


class ChannelService:
    """Service for channel operations."""

    def __init__(self, controller, db_controller):
        self._ctrl = controller
        self._db_ctrl = db_controller

    async def create_channel(
        self,
        name: str,
        category_id: int | None = None,
        position: int | None = None,
    ) -> ChannelData:
        """Create a new channel and persist to database."""
        channel = await self._ctrl.create_channel(name, category_id, position)

        try:
            await self._db_ctrl.create_channel(
                channel_id=str(channel.id),
                channel_name=channel.name,
                category_id=str(channel.category_id),
            )
        except Exception as e:
            logger.error(f"Failed to save channel to database: {e}")

        return ChannelData(
            id=channel.id,
            name=channel.name,
            category_id=channel.category_id,
            position=channel.position,
        )

    async def delete_channel(self, channel_id: int) -> bool:
        """Delete a channel and remove from database."""
        success = await self._ctrl.delete_channel(channel_id)

        if success:
            try:
                await self._db_ctrl.delete_channel(channel_id=str(channel_id))
            except Exception as e:
                logger.error(f"Failed to delete channel from database: {e}")

        return success

    async def list_channels(self) -> list[ChannelData]:
        """List all channels."""
        channels = await self._ctrl.list_channels()
        return [
            ChannelData(
                id=c.id,
                name=c.name,
                category_id=c.category_id,
                position=c.position,
            )
            for c in channels
        ]

    async def list_channel_roles(self, channel_id: int) -> list[RoleData]:
        """List roles associated with a channel."""
        roles = await self._ctrl.list_channel_roles(channel_id)
        return [
            RoleData(id=r.id, name=r.name, color=r.color, position=r.position)
            for r in roles
        ]
