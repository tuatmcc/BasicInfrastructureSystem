"""Database controller wrapper that posts DB mutation results to Discord."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from DiscordConnector.DiscordController.interface import IDiscordController
from DiscordConnector.DiscordDatabaseController.interface import (
    Category,
    Channel,
    IDiscordDatabaseController,
    Role,
    User,
)

logger = logging.getLogger(__name__)


class DiscordLoggingDatabaseController(IDiscordDatabaseController):
    """Wrap a database controller and log mutation outcomes to Discord."""

    def __init__(
        self,
        controller: IDiscordDatabaseController,
        discord_controller: IDiscordController,
        log_channel_id: int,
    ):
        self._controller = controller
        self._discord_controller = discord_controller
        self._log_channel_id = log_channel_id

    async def connect(self) -> None:
        await self._controller.connect()

    async def disconnect(self) -> None:
        await self._controller.disconnect()

    async def __aenter__(self) -> "DiscordLoggingDatabaseController":
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.disconnect()

    async def _send_log(
        self,
        operation: str,
        status: str,
        target: str,
        detail: str,
    ) -> None:
        content = "\n".join(
            [
                "[DB LOG]",
                f"operation: {operation}",
                f"status: {status}",
                f"target: {target}",
                f"detail: {detail}",
            ]
        )
        try:
            await self._discord_controller.create_message(self._log_channel_id, content)
        except Exception:
            logger.exception(
                "Failed to send DB log to Discord for operation=%s target=%s",
                operation,
                target,
            )

    async def _execute_mutation(
        self,
        operation: str,
        target: str,
        action: Callable[[], Awaitable[Any]],
    ) -> Any:
        try:
            result = await action()
        except Exception as exc:
            await self._send_log(
                operation=operation,
                status="failure",
                target=target,
                detail=f"{type(exc).__name__}: {exc}",
            )
            raise

        if result is False or result is None:
            await self._send_log(
                operation=operation,
                status="failure",
                target=target,
                detail=f"returned {result!r}",
            )
            return result

        await self._send_log(
            operation=operation,
            status="success",
            target=target,
            detail=self._summarize_result(result),
        )
        return result

    def _summarize_result(self, result: Any) -> str:
        if isinstance(result, bool):
            return f"returned {result!r}"
        if isinstance(result, int):
            return f"updated count={result}"
        if isinstance(result, User):
            return (
                "user "
                f"discord_user_id={result.discord_user_id} "
                f"display_name={result.display_name}"
            )
        if isinstance(result, Role):
            return f"role role_id={result.role_id} role_name={result.role_name}"
        if isinstance(result, Category):
            return (
                f"category category_id={result.category_id} "
                f"category_name={result.category_name}"
            )
        if isinstance(result, Channel):
            return (
                f"channel channel_id={result.channel_id} "
                f"channel_name={result.channel_name}"
            )
        return repr(result)

    async def get_users(self, member_id: str | None = None) -> list[User]:
        return await self._controller.get_users(member_id)

    async def get_user(self, discord_user_id: str) -> User | None:
        return await self._controller.get_user(discord_user_id)

    async def create_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User:
        return await self._execute_mutation(
            operation="create_user",
            target=f"discord_user_id={discord_user_id}",
            action=lambda: self._controller.create_user(
                discord_user_id=discord_user_id,
                display_name=display_name,
                member_id=member_id,
            ),
        )

    async def update_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User | None:
        return await self._execute_mutation(
            operation="update_user",
            target=f"discord_user_id={discord_user_id}",
            action=lambda: self._controller.update_user(
                discord_user_id=discord_user_id,
                display_name=display_name,
                member_id=member_id,
            ),
        )

    async def delete_user(self, discord_user_id: str) -> bool:
        return await self._execute_mutation(
            operation="delete_user",
            target=f"discord_user_id={discord_user_id}",
            action=lambda: self._controller.delete_user(discord_user_id),
        )

    async def sync_user_roles(
        self,
        discord_user_id: str,
        role_ids: list[str],
    ) -> int:
        return await self._execute_mutation(
            operation="sync_user_roles",
            target=f"discord_user_id={discord_user_id}, role_ids={role_ids}",
            action=lambda: self._controller.sync_user_roles(discord_user_id, role_ids),
        )

    async def get_roles(self) -> list[Role]:
        return await self._controller.get_roles()

    async def get_role(self, role_id: str) -> Role | None:
        return await self._controller.get_role(role_id)

    async def create_role(
        self,
        role_id: str,
        role_name: str,
        permissions: int,
    ) -> Role:
        return await self._execute_mutation(
            operation="create_role",
            target=f"role_id={role_id}",
            action=lambda: self._controller.create_role(
                role_id=role_id,
                role_name=role_name,
                permissions=permissions,
            ),
        )

    async def update_role(
        self,
        role_id: str,
        role_name: str | None = None,
        permissions: int | None = None,
    ) -> Role | None:
        return await self._execute_mutation(
            operation="update_role",
            target=f"role_id={role_id}",
            action=lambda: self._controller.update_role(
                role_id=role_id,
                role_name=role_name,
                permissions=permissions,
            ),
        )

    async def delete_role(self, role_id: str) -> bool:
        return await self._execute_mutation(
            operation="delete_role",
            target=f"role_id={role_id}",
            action=lambda: self._controller.delete_role(role_id),
        )

    async def get_categories(self) -> list[Category]:
        return await self._controller.get_categories()

    async def get_category(self, category_id: str) -> Category | None:
        return await self._controller.get_category(category_id)

    async def create_category(
        self,
        category_id: str,
        category_name: str,
    ) -> Category:
        return await self._execute_mutation(
            operation="create_category",
            target=f"category_id={category_id}",
            action=lambda: self._controller.create_category(
                category_id=category_id,
                category_name=category_name,
            ),
        )

    async def delete_category(self, category_id: str) -> bool:
        return await self._execute_mutation(
            operation="delete_category",
            target=f"category_id={category_id}",
            action=lambda: self._controller.delete_category(category_id),
        )

    async def sync_category_permissions(
        self,
        category_id: str,
        role_ids: list[str],
    ) -> int:
        return await self._execute_mutation(
            operation="sync_category_permissions",
            target=f"category_id={category_id}, role_ids={role_ids}",
            action=lambda: self._controller.sync_category_permissions(category_id, role_ids),
        )

    async def get_channels(self) -> list[Channel]:
        return await self._controller.get_channels()

    async def get_channel(self, channel_id: str) -> Channel | None:
        return await self._controller.get_channel(channel_id)

    async def create_channel(
        self,
        channel_id: str,
        channel_name: str,
        category_id: str,
        allowed_role_ids: list[str] | None = None,
    ) -> Channel:
        return await self._execute_mutation(
            operation="create_channel",
            target=f"channel_id={channel_id}, category_id={category_id}",
            action=lambda: self._controller.create_channel(
                channel_id=channel_id,
                channel_name=channel_name,
                category_id=category_id,
                allowed_role_ids=allowed_role_ids,
            ),
        )

    async def delete_channel(self, channel_id: str) -> bool:
        return await self._execute_mutation(
            operation="delete_channel",
            target=f"channel_id={channel_id}",
            action=lambda: self._controller.delete_channel(channel_id),
        )

    async def sync_channel_permissions(
        self,
        channel_id: str,
        role_ids: list[str],
    ) -> int:
        return await self._execute_mutation(
            operation="sync_channel_permissions",
            target=f"channel_id={channel_id}, role_ids={role_ids}",
            action=lambda: self._controller.sync_channel_permissions(channel_id, role_ids),
        )
