"""Tests for controller dependency wiring."""

import logging
from unittest.mock import AsyncMock

from DiscordConnector.ControlInterface import dependencies
from DiscordConnector.DiscordDatabaseController.controller import (
    DiscordDatabaseController,
)
from DiscordConnector.DiscordDatabaseController.logging_controller import (
    DiscordLoggingDatabaseController,
)


class TestCreateDbController:
    def test_wraps_db_controller_when_log_channel_is_configured(self, monkeypatch):
        monkeypatch.setattr(dependencies, "MOCK_MODE", False)
        monkeypatch.setattr(
            dependencies,
            "get_database_url",
            lambda: "postgresql+asyncpg://user:pass@localhost:5432/db",
        )
        monkeypatch.setattr(dependencies, "get_discord_log_channel_id", lambda: 123456)
        monkeypatch.setattr(dependencies, "_controller", AsyncMock())

        controller = dependencies._create_db_controller()

        assert isinstance(controller, DiscordLoggingDatabaseController)
        assert isinstance(controller._controller, DiscordDatabaseController)

    def test_warns_when_log_channel_is_missing(self, monkeypatch, caplog):
        monkeypatch.setattr(dependencies, "MOCK_MODE", False)
        monkeypatch.setattr(
            dependencies,
            "get_database_url",
            lambda: "postgresql+asyncpg://user:pass@localhost:5432/db",
        )
        monkeypatch.setattr(dependencies, "get_discord_log_channel_id", lambda: None)
        monkeypatch.setattr(dependencies, "_controller", AsyncMock())

        with caplog.at_level(logging.WARNING):
            controller = dependencies._create_db_controller()

        assert isinstance(controller, DiscordDatabaseController)
        assert not isinstance(controller, DiscordLoggingDatabaseController)
        assert (
            "DISCORD_LOG_CHANNEL_ID is not set or invalid; DB change logs to Discord are disabled"
            in caplog.text
        )

    def test_mock_mode_skips_warning(self, monkeypatch, caplog):
        monkeypatch.setattr(dependencies, "MOCK_MODE", True)

        with caplog.at_level(logging.WARNING):
            controller = dependencies._create_db_controller()

        assert "DISCORD_LOG_CHANNEL_ID" not in caplog.text
        assert controller.__class__.__name__ == "MockDiscordDatabaseController"
