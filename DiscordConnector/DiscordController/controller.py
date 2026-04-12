import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import discord

from DiscordConnector.DiscordController import bot, cmds
from DiscordConnector.DiscordController.interface import (
    Category,
    Channel,
    DiscordConnectionError,
    IDiscordController,
    Member,
    Message,
    Reaction,
    Role,
)

logger = logging.getLogger(__name__)

CONNECT_TIMEOUT_SECONDS = 15


#メソッドは適当。後でお話し合いをするべき
class DiscordController(IDiscordController):
    def __init__(self):
        self.client = None
        self.guild = None
        self._ready_event = None
        self._runner_task = None
        self._guild_id = None
        self._operation_lock = asyncio.Lock()

    async def connect(self) -> None:
        if self._runner_task is not None:
            if not self._runner_task.done():
                return
            self._reset_connection_state()

        token, guild_id = bot.get_connection_settings()
        self.client = bot.create_client()
        self._guild_id = guild_id
        self._ready_event = asyncio.Event()

        @self.client.event
        async def on_ready():
            logger.info("Discord client is ready")
            self._ready_event.set()

        logger.info("Connecting to Discord gateway")
        self._runner_task = asyncio.create_task(self.client.start(token))
        ready_wait_task = asyncio.create_task(self._ready_event.wait())

        try:
            done, _ = await asyncio.wait(
                {self._runner_task, ready_wait_task},
                timeout=CONNECT_TIMEOUT_SECONDS,
                return_when=asyncio.FIRST_COMPLETED,
            )
            if ready_wait_task in done:
                return

            if self._runner_task in done:
                exc = self._runner_task.exception()
                if exc is not None:
                    logger.error("Discord client failed before ready", exc_info=exc)
                    raise exc
                raise RuntimeError("Discord client stopped before it became ready")

            raise TimeoutError(
                f"Discord client did not become ready within {CONNECT_TIMEOUT_SECONDS} seconds"
            )
        except Exception as exc:
            await self._abort_connection()
            raise self._wrap_connection_error(exc) from exc
        finally:
            ready_wait_task.cancel()
            try:
                await ready_wait_task
            except asyncio.CancelledError:
                pass

    async def disconnect(self) -> None:
        if self._runner_task is None:
            return

        logger.info("Disconnecting Discord client")
        try:
            if self.client is not None and not self.client.is_closed():
                await self.client.close()
            try:
                await self._runner_task
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Discord runner task ended with an error during disconnect")
        finally:
            self._reset_connection_state()
    
    async def __aenter__(self):
        await self.connect()
        await self.set_guild()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.disconnect()

    async def set_guild(self) -> None:
        if self._ready_event is None:
            await self.connect()

        await self._ready_event.wait()
        self.guild = self.client.get_guild(self._guild_id)
        if self.guild is None:
            raise DiscordConnectionError("Connected to Discord but failed to access the configured guild")
        logger.info("Connected to guild %s", self.guild.id)

    async def _abort_connection(self) -> None:
        """Abort a failed connection attempt and clear internal state."""
        try:
            if self.client is not None and not self.client.is_closed():
                await self.client.close()
            if self._runner_task is not None:
                try:
                    await self._runner_task
                except Exception as exc:
                    logger.debug("Suppressing Discord runner exception during cleanup: %s", exc)
        finally:
            self._reset_connection_state()

    def _reset_connection_state(self) -> None:
        self.client = None
        self.guild = None
        self._ready_event = None
        self._runner_task = None
        self._guild_id = None

    def _wrap_connection_error(self, exc: Exception) -> DiscordConnectionError:
        if isinstance(exc, DiscordConnectionError):
            return exc
        if isinstance(exc, discord.LoginFailure):
            return DiscordConnectionError("Discord login failed. Check the bot token.")
        if isinstance(exc, TimeoutError):
            return DiscordConnectionError(
                f"Discord client did not become ready within {CONNECT_TIMEOUT_SECONDS} seconds"
            )
        return DiscordConnectionError("Failed to connect to Discord")

    async def _execute_with_connection(
        self,
        command: Callable[..., Awaitable[Any]],
        *args,
        **kwargs,
    ) -> Any:
        async with self._operation_lock:
            should_disconnect = self._runner_task is None or self._runner_task.done()
            try:
                if should_disconnect:
                    await self.connect()
                await self.set_guild()
                return await command(*args, **kwargs)
            finally:
                if should_disconnect:
                    await self.disconnect()

    async def hello_no_dec(self, ch_name: str) -> None:
        if self.guild is None:
            print("guild is null")
            return

        if not self.guild.text_channels:
            print("No text channels in the guild")
            return

        for tc in self.guild.text_channels:
            if tc.name == ch_name:
                print(f"found channel: {tc.name}")
                return

        print(f"channel not found: {ch_name}")

    @bot.logged_command
    async def create_role(self, name: str, color: tuple[int, int, int]|None=None, position: int|None=None) -> Role:
        return await cmds.role.create(name, color, position, self.guild)

    @bot.logged_command
    async def delete_role(self, id: int) -> bool:
        return await cmds.role.delete(id, self.guild)

    @bot.logged_command
    async def list_roles(self) -> list[Role]:
        return await cmds.role.list_(self.guild)

    @bot.logged_command
    async def list_role_members(self, role_id: int) -> list[Member]:
        return await cmds.role.list_members(role_id, self.guild)

    @bot.logged_command
    async def create_channel(self, name: str, category_id: int|None=None, position: int|None=None) -> Channel:
        return await cmds.channel.create(name, category_id, position, self.guild)

    @bot.logged_command
    async def delete_channel(self, id: int) -> bool:
        return await cmds.channel.delete(id, self.guild)

    @bot.logged_command
    async def list_channels(self) -> list[Channel]:
        return await cmds.channel.list_(self.guild)

    @bot.logged_command
    async def list_channel_roles(self, channel_id: int) -> list[Role]:
        return await cmds.channel.list_roles(channel_id, self.guild)

    @bot.logged_command
    async def create_category(self, name: str, position: int|None=None) -> Category:
        return await cmds.category.create(name, position, self.guild)

    @bot.logged_command
    async def delete_category(self, id: int) -> bool:
        return await cmds.category.delete(id, self.guild)

    @bot.logged_command
    async def list_categories(self) -> list[Category]:
        return await cmds.category.list_(self.guild)

    @bot.logged_command
    async def list_members(self) -> list[Member]:
        return await cmds.member.list_(self.guild)

    @bot.logged_command
    async def list_member_roles(self, member_id: int) -> list[Role]:
        return await cmds.member.list_roles(member_id, self.guild)

    @bot.logged_command
    async def ban_member(self, id: int) -> bool:
        return await cmds.member.ban(id, self.guild)

    @bot.logged_command
    async def kick_member(self, id: int) -> bool:
        return await cmds.member.kick(id, self.guild)

    @bot.logged_command
    async def create_message(self, channel_id: int, content: str) -> Message:
        return await cmds.message.create(channel_id, content, self.guild)

    @bot.logged_command
    async def delete_message(self, channel_id: int, message_id: int) -> bool:
        return await cmds.message.delete(channel_id, message_id, self.guild)

    @bot.logged_command
    async def total_reactions(self, channel_id: int, message_id: int) -> list[Reaction]:
        return await cmds.message.reactions(channel_id, message_id, self.guild)
