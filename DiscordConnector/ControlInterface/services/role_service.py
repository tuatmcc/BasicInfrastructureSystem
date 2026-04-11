"""Role service - business logic for role operations."""

import logging
from dataclasses import dataclass

from DiscordConnector.DiscordController.interface import IDiscordController
from DiscordConnector.DiscordDatabaseController.interface import (
    IDiscordDatabaseController,
)

logger = logging.getLogger(__name__)


@dataclass
class RoleData:
    """Domain object for role."""
    id: int
    name: str
    color: tuple[int, int, int]
    position: int
    permissions: int | None = None


@dataclass
class MemberData:
    """Domain object for member (minimal)."""
    id: int
    name: str


class RoleService:
    """Service for role operations."""

    def __init__(
        self,
        controller: IDiscordController,
        db_controller: IDiscordDatabaseController,
    ):
        self._ctrl = controller
        self._db_ctrl = db_controller

    async def create_role(
        self,
        name: str,
        color: tuple[int, int, int] | None = None,
        position: int | None = None,
    ) -> RoleData:
        """Create a new role and persist to database."""
        role = await self._ctrl.create_role(name, color, position)

        try:
            await self._db_ctrl.create_role(
                role_id=str(role.id),
                role_name=role.name,
                permissions=role.permissions,
            )
        except Exception as e:
            logger.error(f"Failed to save role to database: {e}")

        return RoleData(
            id=role.id,
            name=role.name,
            color=role.color,
            position=role.position,
            permissions=getattr(role, "permissions", None),
        )

    async def delete_role(self, role_id: int) -> bool:
        """Delete a role and remove from database."""
        success = await self._ctrl.delete_role(role_id)

        if success:
            try:
                await self._db_ctrl.delete_role(role_id=str(role_id))
            except Exception as e:
                logger.error(f"Failed to delete role from database: {e}")

        return success

    async def list_roles(self) -> list[RoleData]:
        """List all roles."""
        roles = await self._ctrl.list_roles()
        return [
            RoleData(id=r.id, name=r.name, color=r.color, position=r.position)
            for r in roles
        ]

    async def list_role_members(self, role_id: int) -> list[MemberData]:
        """List members with a specific role."""
        members = await self._ctrl.list_role_members(role_id)
        return [MemberData(id=m.id, name=m.name) for m in members]
