"""Tests for ChannelService."""
import pytest


class TestChannelServiceCreate:
    """Tests for ChannelService.create_channel."""

    @pytest.mark.asyncio
    async def test_create_channel_with_all_fields(self, channel_service):
        channel = await channel_service.create_channel("test-channel", 400, 3)
        assert channel.name == "test-channel"
        assert channel.category_id == 400
        assert channel.position == 3
        assert channel.id is not None

    @pytest.mark.asyncio
    async def test_create_channel_with_name_only(self, channel_service):
        channel = await channel_service.create_channel("minimal-channel")
        assert channel.name == "minimal-channel"
        assert channel.id is not None


class TestChannelServiceDelete:
    """Tests for ChannelService.delete_channel."""

    @pytest.mark.asyncio
    async def test_delete_channel(self, channel_service):
        success = await channel_service.delete_channel(12345)
        assert success is True


class TestChannelServiceList:
    """Tests for ChannelService.list_channels."""

    @pytest.mark.asyncio
    async def test_list_channels(self, channel_service):
        channels = await channel_service.list_channels()
        assert isinstance(channels, list)
        assert len(channels) > 0
        channel = channels[0]
        assert channel.id is not None
        assert channel.name is not None
        assert channel.category_id is not None
        assert channel.position is not None


class TestChannelServiceListRoles:
    """Tests for ChannelService.list_channel_roles."""

    @pytest.mark.asyncio
    async def test_list_channel_roles(self, channel_service):
        roles = await channel_service.list_channel_roles(300)
        assert isinstance(roles, list)
        if len(roles) > 0:
            role = roles[0]
            assert role.id is not None
            assert role.name is not None
            assert role.color is not None
            assert role.position is not None
