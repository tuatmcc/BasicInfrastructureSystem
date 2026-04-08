"""Message service - business logic for message and reaction operations."""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MessageData:
    """Domain object for message."""
    id: int
    content: str
    author_id: int
    channel_id: int


@dataclass
class ReactionData:
    """Domain object for reaction."""
    emoji: str
    member_ids: list[int]
    me: bool
    message_id: int


class MessageService:
    """Service for message and reaction operations."""

    def __init__(self, controller, db_controller=None):
        self._ctrl = controller
        self._db_ctrl = db_controller

    async def create_message(self, channel_id: int, content: str) -> MessageData:
        """Create a new message."""
        message = await self._ctrl.create_message(channel_id, content)
        return MessageData(
            id=message.id,
            content=message.content,
            author_id=message.author_id,
            channel_id=message.channel_id,
        )

    async def delete_message(self, channel_id: int, message_id: int) -> bool:
        """Delete a message."""
        return await self._ctrl.delete_message(channel_id, message_id)

    async def total_reactions(
        self, channel_id: int, message_id: int
    ) -> list[ReactionData]:
        """Get all reactions for a message."""
        reactions = await self._ctrl.total_reactions(channel_id, message_id)
        return [
            ReactionData(
                emoji=r.emoji,
                member_ids=r.member_ids,
                me=r.me,
                message_id=r.message_id,
            )
            for r in reactions
        ]
