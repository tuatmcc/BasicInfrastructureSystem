"""Dependencies for PublicAPI."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

from DiscordConnector.ControlInterface.dependencies import (
    get_controller,
    get_db_controller,
    lifespan as control_interface_lifespan,
)
from DiscordConnector.ControlInterface.services import (
    RoleService,
    ChannelService,
    CategoryService,
    MemberService,
    MessageService,
)

logger = logging.getLogger(__name__)

_role_service: RoleService | None = None
_channel_service: ChannelService | None = None
_category_service: CategoryService | None = None
_member_service: MemberService | None = None
_message_service: MessageService | None = None


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator[None, None]:
    """Manage service lifecycle with FastAPI app."""
    global _role_service, _channel_service, _category_service, _member_service, _message_service

    # Use ControlInterface's lifespan to initialize controllers
    async with control_interface_lifespan(app):
        ctrl = get_controller()
        db_ctrl = get_db_controller()

        _role_service = RoleService(ctrl, db_ctrl)
        _channel_service = ChannelService(ctrl, db_ctrl)
        _category_service = CategoryService(ctrl, db_ctrl)
        _member_service = MemberService(ctrl, db_ctrl)
        _message_service = MessageService(ctrl, db_ctrl)

        yield

    _role_service = None
    _channel_service = None
    _category_service = None
    _member_service = None
    _message_service = None


def get_role_service() -> RoleService:
    """Dependency to get the RoleService instance."""
    if _role_service is None:
        raise RuntimeError("RoleService not initialized")
    return _role_service


def get_channel_service() -> ChannelService:
    """Dependency to get the ChannelService instance."""
    if _channel_service is None:
        raise RuntimeError("ChannelService not initialized")
    return _channel_service


def get_category_service() -> CategoryService:
    """Dependency to get the CategoryService instance."""
    if _category_service is None:
        raise RuntimeError("CategoryService not initialized")
    return _category_service


def get_member_service() -> MemberService:
    """Dependency to get the MemberService instance."""
    if _member_service is None:
        raise RuntimeError("MemberService not initialized")
    return _member_service


def get_message_service() -> MessageService:
    """Dependency to get the MessageService instance."""
    if _message_service is None:
        raise RuntimeError("MessageService not initialized")
    return _message_service
