"""Tests for MessageService."""
import pytest


class TestMessageServiceCreate:
    """Tests for MessageService.create_message."""

    @pytest.mark.asyncio
    async def test_create_message(self, message_service):
        message = await message_service.create_message(300, "Hello, World!")
        assert message.content == "Hello, World!"
        assert message.channel_id == 300
        assert message.id is not None
        assert message.author_id is not None


class TestMessageServiceDelete:
    """Tests for MessageService.delete_message."""

    @pytest.mark.asyncio
    async def test_delete_message(self, message_service):
        success = await message_service.delete_message(300, 500)
        assert success is True


class TestMessageServiceReactions:
    """Tests for MessageService.total_reactions."""

    @pytest.mark.asyncio
    async def test_total_reactions(self, message_service):
        reactions = await message_service.total_reactions(300, 500)
        assert isinstance(reactions, list)
        if len(reactions) > 0:
            reaction = reactions[0]
            assert reaction.emoji is not None
            assert reaction.member_ids is not None
            assert reaction.me is not None
            assert reaction.message_id is not None
