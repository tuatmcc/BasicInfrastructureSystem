"""Tests for service layer with database integration."""

import pytest


class TestRoleServiceCreateWithDB:
    """Tests for RoleService.create_role with database integration."""

    @pytest.mark.asyncio
    async def test_create_role_saves_to_db(self, role_service_with_db, db_controller):
        role = await role_service_with_db.create_role("TestRole", (255, 100, 50), 5)
        
        # Verify role was saved to database
        db_role = await db_controller.get_role(str(role.id))
        assert db_role is not None
        assert db_role.role_name == "TestRole"
        assert db_role.permissions == 0


class TestRoleServiceDeleteWithDB:
    """Tests for RoleService.delete_role with database integration."""

    @pytest.mark.asyncio
    async def test_delete_role_removes_from_db(self, role_service_with_db, db_controller):
        # First create a role
        role = await role_service_with_db.create_role("ToDelete")
        role_id = role.id
        
        # Verify it exists in DB
        db_role = await db_controller.get_role(str(role_id))
        assert db_role is not None
        
        # Delete via service
        await role_service_with_db.delete_role(role_id)
        
        # Verify it's removed from DB
        db_role = await db_controller.get_role(str(role_id))
        assert db_role is None


class TestCategoryServiceCreateWithDB:
    """Tests for CategoryService.create_category with database integration."""

    @pytest.mark.asyncio
    async def test_create_category_saves_to_db(self, category_service_with_db, db_controller):
        category = await category_service_with_db.create_category("Test Category", 5)
        
        # Verify category was saved to database
        db_category = await db_controller.get_category(str(category.id))
        assert db_category is not None
        assert db_category.category_name == "Test Category"


class TestChannelServiceCreateWithDB:
    """Tests for ChannelService.create_channel with database integration."""

    @pytest.mark.asyncio
    async def test_create_channel_saves_to_db(
        self, category_service_with_db, channel_service_with_db, db_controller
    ):
        # First create a category (required for channel)
        category = await category_service_with_db.create_category("Test Category")
        category_id = category.id
        
        # Create channel
        channel = await channel_service_with_db.create_channel("test-channel", category_id)
        
        # Verify channel was saved to database
        db_channel = await db_controller.get_channel(str(channel.id))
        assert db_channel is not None
        assert db_channel.channel_name == "test-channel"
        assert db_channel.category_id == str(category_id)


class TestMemberServiceWithDB:
    """Tests for member operations with database integration."""

    @pytest.mark.asyncio
    async def test_list_members_returns_data(self, member_service_with_db):
        """List members should return member data."""
        members = await member_service_with_db.list_members()
        assert isinstance(members, list)
        assert len(members) > 0
        member = members[0]
        assert member.id is not None
        assert member.name is not None

    @pytest.mark.asyncio
    async def test_list_member_roles_returns_data(self, member_service_with_db):
        """List member roles should return role data."""
        members = await member_service_with_db.list_members()
        assert len(members) > 0
        member_id = members[0].id

        roles = await member_service_with_db.list_member_roles(member_id)
        assert isinstance(roles, list)


class TestMessageServiceWithDB:
    """Tests for message operations with database integration."""

    @pytest.mark.asyncio
    async def test_create_message_returns_data(self, channel_service_with_db, message_service):
        """Creating a message should return message data."""
        channels = await channel_service_with_db.list_channels()
        assert len(channels) > 0
        channel_id = channels[0].id

        message = await message_service.create_message(channel_id, "Test message content")
        assert message.id is not None
        assert message.content == "Test message content"
        assert message.channel_id == channel_id

    @pytest.mark.asyncio
    async def test_delete_message_succeeds(self, channel_service_with_db, message_service):
        """Deleting a message should succeed."""
        channels = await channel_service_with_db.list_channels()
        channel_id = channels[0].id

        message = await message_service.create_message(channel_id, "Message to delete")
        message_id = message.id

        success = await message_service.delete_message(channel_id, message_id)
        assert success is True


class TestPermissionSyncWithDB:
    """Tests for permission synchronization with database."""

    @pytest.mark.asyncio
    async def test_sync_channel_permissions(
        self, role_service_with_db, category_service_with_db, channel_service_with_db, db_controller
    ):
        """Channel permissions should be synced to database."""
        # Create roles
        role1 = await role_service_with_db.create_role("PermRole1")
        role1_id = str(role1.id)

        role2 = await role_service_with_db.create_role("PermRole2")
        role2_id = str(role2.id)

        # Create category and channel
        category = await category_service_with_db.create_category("PermTestCategory")
        category_id = category.id

        channel = await channel_service_with_db.create_channel("perm-test-channel", category_id)
        channel_id = str(channel.id)

        # Sync permissions
        sync_count = await db_controller.sync_channel_permissions(
            channel_id, [role1_id, role2_id]
        )
        assert sync_count == 2

        # Verify permissions in DB
        db_channel = await db_controller.get_channel(channel_id)
        assert db_channel is not None
        assert set(db_channel.role_ids) == {role1_id, role2_id}

    @pytest.mark.asyncio
    async def test_sync_category_permissions(
        self, role_service_with_db, category_service_with_db, db_controller
    ):
        """Category permissions should be synced to database."""
        # Create role
        role = await role_service_with_db.create_role("CatPermRole")
        role_id = str(role.id)

        # Create category
        category = await category_service_with_db.create_category("CatPermTest")
        category_id = str(category.id)

        # Sync permissions
        sync_count = await db_controller.sync_category_permissions(
            category_id, [role_id]
        )
        assert sync_count == 1

        # Verify permissions
        db_category = await db_controller.get_category(category_id)
        assert db_category is not None
        assert role_id in db_category.role_ids

    @pytest.mark.asyncio
    async def test_sync_user_roles(self, role_service_with_db, db_controller):
        """User role sync should persist to database."""
        # Create roles
        role1 = await role_service_with_db.create_role("UserRole1")
        role1_id = str(role1.id)

        role2 = await role_service_with_db.create_role("UserRole2")
        role2_id = str(role2.id)

        # Create user in DB
        user = await db_controller.create_user(
            discord_user_id="123456789",
            display_name="TestUser",
        )

        # Sync roles
        sync_count = await db_controller.sync_user_roles(
            user.discord_user_id, [role1_id, role2_id]
        )
        assert sync_count == 2

        # Verify user roles
        db_user = await db_controller.get_user(user.discord_user_id)
        assert db_user is not None
        assert set(db_user.role_ids) == {role1_id, role2_id}

    @pytest.mark.asyncio
    async def test_permission_sync_replaces_existing(
        self, role_service_with_db, category_service_with_db, db_controller
    ):
        """Syncing permissions should replace existing permissions."""
        # Create roles
        role1 = await role_service_with_db.create_role("ReplaceRole1")
        role1_id = str(role1.id)

        role2 = await role_service_with_db.create_role("ReplaceRole2")
        role2_id = str(role2.id)

        role3 = await role_service_with_db.create_role("ReplaceRole3")
        role3_id = str(role3.id)

        # Create category
        category = await category_service_with_db.create_category("ReplacePermCat")
        category_id = str(category.id)

        # Initial sync
        await db_controller.sync_category_permissions(category_id, [role1_id, role2_id])

        # Replace with different roles
        await db_controller.sync_category_permissions(category_id, [role3_id])

        # Verify only new role is present
        db_category = await db_controller.get_category(category_id)
        assert db_category.role_ids == [role3_id]


class TestErrorCasesWithDB:
    """Tests for error cases with database integration."""

    @pytest.mark.asyncio
    async def test_delete_nonexistent_role(self, role_service_with_db, db_controller):
        """Deleting a non-existent role should handle gracefully."""
        # Try to delete role that doesn't exist in DB
        await role_service_with_db.delete_role(999999)

        # Verify nothing in DB
        db_role = await db_controller.get_role("999999")
        assert db_role is None

    @pytest.mark.asyncio
    async def test_sync_permissions_nonexistent_channel(
        self, role_service_with_db, db_controller
    ):
        """Syncing permissions on non-existent channel should raise error."""
        role = await role_service_with_db.create_role("OrphanRole")
        role_id = str(role.id)

        with pytest.raises(Exception):
            await db_controller.sync_channel_permissions("nonexistent", [role_id])

    @pytest.mark.asyncio
    async def test_sync_user_roles_nonexistent_user(
        self, role_service_with_db, db_controller
    ):
        """Syncing roles for non-existent user should raise error."""
        role = await role_service_with_db.create_role("NoUserRole")
        role_id = str(role.id)

        with pytest.raises(Exception):
            await db_controller.sync_user_roles("nonexistent_user", [role_id])

    @pytest.mark.asyncio
    async def test_create_duplicate_user(self, db_controller):
        """Creating a duplicate user should raise error."""
        user_id = "duplicate_user_123"

        # Create first user
        await db_controller.create_user(
            discord_user_id=user_id,
            display_name="FirstUser",
        )

        # Try to create duplicate
        with pytest.raises(Exception):
            await db_controller.create_user(
                discord_user_id=user_id,
                display_name="DuplicateUser",
            )

    @pytest.mark.asyncio
    async def test_delete_category_removes_channel_permissions(
        self, role_service_with_db, category_service_with_db, channel_service_with_db, db_controller
    ):
        """Deleting a category should also clean up channel permissions."""
        # Create role
        role = await role_service_with_db.create_role("CascadePermRole")
        role_id = str(role.id)

        # Create category and channel
        category = await category_service_with_db.create_category("CascadeCategory")
        category_id = category.id

        channel = await channel_service_with_db.create_channel("cascade-channel", category_id)
        channel_id = str(channel.id)

        # Sync permissions
        await db_controller.sync_channel_permissions(channel_id, [role_id])

        # Verify channel has permissions
        db_channel = await db_controller.get_channel(channel_id)
        assert len(db_channel.role_ids) == 1

        # Delete category
        await category_service_with_db.delete_category(category_id)

        # Verify channel is gone
        db_channel = await db_controller.get_channel(channel_id)
        assert db_channel is None
