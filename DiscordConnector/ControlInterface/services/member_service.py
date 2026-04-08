"""Member service - business logic for member operations."""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MemberData:
    """Domain object for member."""
    id: int
    name: str


@dataclass
class RoleData:
    """Domain object for role (minimal)."""
    id: int
    name: str
    color: tuple[int, int, int]
    position: int


class MemberService:
    """Service for member operations."""

    def __init__(self, controller, db_controller):
        self._ctrl = controller
        self._db_ctrl = db_controller

    async def list_members(self) -> list[MemberData]:
        """List all members."""
        members = await self._ctrl.list_members()
        return [MemberData(id=m.id, name=m.name) for m in members]

    async def ban_member(self, member_id: int) -> bool:
        """Ban a member and remove from database."""
        success = await self._ctrl.ban_member(member_id)

        if success:
            try:
                await self._db_ctrl.delete_user(discord_user_id=str(member_id))
            except Exception as e:
                logger.error(f"Failed to delete user from database: {e}")

        return success

    async def timeout_member(self, member_id: int) -> bool:
        """Timeout (kick) a member."""
        return await self._ctrl.kick_member(member_id)

    async def list_member_roles(self, member_id: int) -> list[RoleData]:
        """List roles for a specific member."""
        roles = await self._ctrl.list_member_roles(member_id)
        return [
            RoleData(id=r.id, name=r.name, color=r.color, position=r.position)
            for r in roles
        ]
