"""Tests for DiscordController connection lifecycle."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from DiscordConnector.DiscordController.controller import DiscordController


def _make_ready_client() -> MagicMock:
    client = MagicMock()
    client.is_closed.return_value = False
    client.close = AsyncMock()
    client.get_guild.return_value = MagicMock(id=12345)

    def register_event(handler):
        if handler.__name__ == "on_ready":
            client._on_ready = handler
        return handler

    client.event.side_effect = register_event
    return client


def _configure_connected_client(client: MagicMock) -> None:
    stop_event = asyncio.Event()

    async def start_side_effect(token):
        await client._on_ready()
        await stop_event.wait()

    async def close_side_effect():
        stop_event.set()

    client.start = AsyncMock(side_effect=start_side_effect)
    client.close = AsyncMock(side_effect=close_side_effect)


@pytest.mark.asyncio
async def test_operation_connects_and_disconnects_once(monkeypatch):
    controller = DiscordController()
    client = _make_ready_client()
    _configure_connected_client(client)

    monkeypatch.setattr(
        "DiscordConnector.DiscordController.bot.get_connection_settings",
        lambda: ("token", 12345),
    )
    monkeypatch.setattr(
        "DiscordConnector.DiscordController.bot.create_client",
        lambda: client,
    )
    monkeypatch.setattr(
        "DiscordConnector.DiscordController.cmds.role.list_",
        AsyncMock(return_value=[]),
    )

    result = await controller.list_roles()

    assert result == []
    client.start.assert_awaited_once_with("token")
    client.close.assert_awaited_once()
    client.get_guild.assert_called_once_with(12345)
    assert controller.client is None
    assert controller.guild is None


@pytest.mark.asyncio
async def test_operation_disconnects_when_command_fails(monkeypatch):
    controller = DiscordController()
    client = _make_ready_client()
    _configure_connected_client(client)

    monkeypatch.setattr(
        "DiscordConnector.DiscordController.bot.get_connection_settings",
        lambda: ("token", 12345),
    )
    monkeypatch.setattr(
        "DiscordConnector.DiscordController.bot.create_client",
        lambda: client,
    )

    async def fail_list(_guild):
        raise RuntimeError("boom")

    monkeypatch.setattr("DiscordConnector.DiscordController.cmds.role.list_", fail_list)

    with pytest.raises(RuntimeError, match="boom"):
        await controller.list_roles()

    client.close.assert_awaited_once()
    assert controller.client is None


@pytest.mark.asyncio
async def test_context_manager_keeps_connection_for_multiple_operations(monkeypatch):
    controller = DiscordController()
    client = _make_ready_client()
    _configure_connected_client(client)

    monkeypatch.setattr(
        "DiscordConnector.DiscordController.bot.get_connection_settings",
        lambda: ("token", 12345),
    )
    monkeypatch.setattr(
        "DiscordConnector.DiscordController.bot.create_client",
        lambda: client,
    )
    monkeypatch.setattr(
        "DiscordConnector.DiscordController.cmds.role.list_",
        AsyncMock(return_value=[]),
    )
    monkeypatch.setattr(
        "DiscordConnector.DiscordController.cmds.channel.list_",
        AsyncMock(return_value=[]),
    )

    async with controller:
        await controller.list_roles()
        await controller.list_channels()

    client.start.assert_awaited_once_with("token")
    client.close.assert_awaited_once()
