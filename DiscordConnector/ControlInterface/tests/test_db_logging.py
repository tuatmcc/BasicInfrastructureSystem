"""Tests for Discord DB logging wrapper."""

from unittest.mock import AsyncMock

import pytest

from DiscordConnector.DiscordDatabaseController.interface import DatabaseError, Role
from DiscordConnector.DiscordDatabaseController.logging_controller import (
    DiscordLoggingDatabaseController,
)


@pytest.fixture
def db_controller_mock():
    return AsyncMock()


@pytest.fixture
def discord_controller_mock():
    controller = AsyncMock()
    controller.create_message = AsyncMock()
    return controller


@pytest.fixture
def logging_db_controller(db_controller_mock, discord_controller_mock):
    return DiscordLoggingDatabaseController(
        controller=db_controller_mock,
        discord_controller=discord_controller_mock,
        log_channel_id=999999,
    )


class TestDiscordLoggingDatabaseController:
    @pytest.mark.asyncio
    async def test_logs_successful_db_mutation(
        self,
        logging_db_controller,
        db_controller_mock,
        discord_controller_mock,
    ):
        db_controller_mock.create_role.return_value = Role(
            role_id="123",
            role_name="Admin",
            permissions=8,
        )

        result = await logging_db_controller.create_role("123", "Admin", 8)

        assert result.role_id == "123"
        discord_controller_mock.create_message.assert_awaited_once()
        _, content = discord_controller_mock.create_message.await_args.args
        assert "operation: create_role" in content
        assert "status: success" in content
        assert "target: role_id=123" in content

    @pytest.mark.asyncio
    async def test_logs_failure_and_reraises_exception(
        self,
        logging_db_controller,
        db_controller_mock,
        discord_controller_mock,
    ):
        db_controller_mock.create_role.side_effect = DatabaseError("duplicate role")

        with pytest.raises(DatabaseError, match="duplicate role"):
            await logging_db_controller.create_role("123", "Admin", 8)

        discord_controller_mock.create_message.assert_awaited_once()
        _, content = discord_controller_mock.create_message.await_args.args
        assert "operation: create_role" in content
        assert "status: failure" in content
        assert "DatabaseError: duplicate role" in content

    @pytest.mark.asyncio
    async def test_logs_false_result_as_failure(
        self,
        logging_db_controller,
        db_controller_mock,
        discord_controller_mock,
    ):
        db_controller_mock.delete_role.return_value = False

        result = await logging_db_controller.delete_role("missing")

        assert result is False
        discord_controller_mock.create_message.assert_awaited_once()
        _, content = discord_controller_mock.create_message.await_args.args
        assert "operation: delete_role" in content
        assert "status: failure" in content
        assert "returned False" in content

    @pytest.mark.asyncio
    async def test_logs_none_result_as_failure(
        self,
        logging_db_controller,
        db_controller_mock,
        discord_controller_mock,
    ):
        db_controller_mock.update_role.return_value = None

        result = await logging_db_controller.update_role("missing", role_name="new")

        assert result is None
        discord_controller_mock.create_message.assert_awaited_once()
        _, content = discord_controller_mock.create_message.await_args.args
        assert "operation: update_role" in content
        assert "status: failure" in content
        assert "returned None" in content

    @pytest.mark.asyncio
    async def test_discord_logging_failure_does_not_change_db_result(
        self,
        caplog,
        logging_db_controller,
        db_controller_mock,
        discord_controller_mock,
    ):
        db_controller_mock.delete_role.return_value = True
        discord_controller_mock.create_message.side_effect = RuntimeError("send failed")

        result = await logging_db_controller.delete_role("123")

        assert result is True
        assert "Failed to send DB log to Discord" in caplog.text
