"""Tests for API endpoints with database integration."""

import pytest


class TestRoleCreateWithDB:
    """Tests for POST /api/v0/role/create with database integration."""

    async def test_create_role_saves_to_db(self, client_with_db, db_controller):
        response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "TestRole", "color": [255, 100, 50], "position": 5},
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify role was saved to database
        db_role = await db_controller.get_role(str(data["id"]))
        assert db_role is not None
        assert db_role.role_name == "TestRole"
        assert db_role.permissions == 0


class TestRoleDeleteWithDB:
    """Tests for POST /api/v0/role/delete with database integration."""

    async def test_delete_role_removes_from_db(self, client_with_db, db_controller):
        # First create a role via API
        create_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "ToDelete"},
        )
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]
        
        # Verify it exists in DB
        db_role = await db_controller.get_role(str(role_id))
        assert db_role is not None
        
        # Delete via API
        delete_response = client_with_db.post(
            "/api/v0/role/delete",
            json={"id": role_id},
        )
        assert delete_response.status_code == 200
        
        # Verify it's removed from DB
        db_role = await db_controller.get_role(str(role_id))
        assert db_role is None


class TestCategoryCreateWithDB:
    """Tests for POST /api/v0/category/create with database integration."""

    async def test_create_category_saves_to_db(self, client_with_db, db_controller):
        response = client_with_db.post(
            "/api/v0/category/create",
            json={"name": "Test Category", "position": 5},
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify category was saved to database
        db_category = await db_controller.get_category(str(data["id"]))
        assert db_category is not None
        assert db_category.category_name == "Test Category"


class TestChannelCreateWithDB:
    """Tests for POST /api/v0/channel/create with database integration."""

    async def test_create_channel_saves_to_db(self, client_with_db, db_controller):
        # First create a category (required for channel)
        cat_response = client_with_db.post(
            "/api/v0/category/create",
            json={"name": "Test Category"},
        )
        assert cat_response.status_code == 200
        category_id = cat_response.json()["id"]
        
        # Create channel
        response = client_with_db.post(
            "/api/v0/channel/create",
            json={"name": "test-channel", "category_id": category_id},
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify channel was saved to database
        db_channel = await db_controller.get_channel(str(data["id"]))
        assert db_channel is not None
        assert db_channel.channel_name == "test-channel"
        assert db_channel.category_id == str(category_id)


class TestMemberWithDB:
    """Tests for member operations with database integration."""

    async def test_list_members_returns_data(self, client_with_db):
        """List members endpoint should return member data."""
        response = client_with_db.get("/api/v0/member/list")
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        assert len(members) > 0
        # Verify member structure
        member = members[0]
        assert "id" in member
        assert "name" in member

    async def test_list_member_roles_returns_data(self, client_with_db):
        """List member roles should return role data."""
        # Get a member first
        members_response = client_with_db.get("/api/v0/member/list")
        assert members_response.status_code == 200
        members = members_response.json()
        assert len(members) > 0
        member_id = members[0]["id"]

        # Get member roles
        response = client_with_db.get(
            "/api/v0/member/list-roles",
            params={"member_id": member_id},
        )
        assert response.status_code == 200
        roles = response.json()
        assert isinstance(roles, list)


class TestMessageWithDB:
    """Tests for message operations with database integration."""

    async def test_create_message_returns_data(self, client_with_db):
        """Creating a message should return message data."""
        # Get a channel first
        channels_response = client_with_db.get("/api/v0/channel/list")
        assert channels_response.status_code == 200
        channels = channels_response.json()
        assert len(channels) > 0
        channel_id = channels[0]["id"]

        # Create message
        response = client_with_db.post(
            "/api/v0/message/create",
            json={"channel_id": channel_id, "content": "Test message content"},
        )
        assert response.status_code == 200
        message = response.json()
        assert "id" in message
        assert message["content"] == "Test message content"
        assert message["channel_id"] == channel_id

    async def test_delete_message_succeeds(self, client_with_db):
        """Deleting a message should succeed."""
        # Get a channel
        channels_response = client_with_db.get("/api/v0/channel/list")
        channels = channels_response.json()
        channel_id = channels[0]["id"]

        # Create message
        create_response = client_with_db.post(
            "/api/v0/message/create",
            json={"channel_id": channel_id, "content": "Message to delete"},
        )
        message_id = create_response.json()["id"]

        # Delete message
        response = client_with_db.post(
            "/api/v0/message/delete",
            json={"channel_id": channel_id, "message_id": message_id},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestPermissionSyncWithDB:
    """Tests for permission synchronization with database."""

    async def test_sync_channel_permissions(self, client_with_db, db_controller):
        """Channel permissions should be synced to database."""
        # Create roles
        role1_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "PermRole1"},
        )
        role1_id = str(role1_response.json()["id"])

        role2_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "PermRole2"},
        )
        role2_id = str(role2_response.json()["id"])

        # Create category and channel
        cat_response = client_with_db.post(
            "/api/v0/category/create",
            json={"name": "PermTestCategory"},
        )
        category_id = cat_response.json()["id"]

        ch_response = client_with_db.post(
            "/api/v0/channel/create",
            json={"name": "perm-test-channel", "category_id": category_id},
        )
        channel_id = str(ch_response.json()["id"])

        # Sync permissions
        sync_count = await db_controller.sync_channel_permissions(
            channel_id, [role1_id, role2_id]
        )
        assert sync_count == 2

        # Verify permissions in DB
        db_channel = await db_controller.get_channel(channel_id)
        assert db_channel is not None
        assert set(db_channel.role_ids) == {role1_id, role2_id}

    async def test_sync_category_permissions(self, client_with_db, db_controller):
        """Category permissions should be synced to database."""
        # Create role
        role_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "CatPermRole"},
        )
        role_id = str(role_response.json()["id"])

        # Create category
        cat_response = client_with_db.post(
            "/api/v0/category/create",
            json={"name": "CatPermTest"},
        )
        category_id = str(cat_response.json()["id"])

        # Sync permissions
        sync_count = await db_controller.sync_category_permissions(
            category_id, [role_id]
        )
        assert sync_count == 1

        # Verify permissions
        db_category = await db_controller.get_category(category_id)
        assert db_category is not None
        assert role_id in db_category.role_ids

    async def test_sync_user_roles(self, client_with_db, db_controller):
        """User role sync should persist to database."""
        # Create roles
        role1_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "UserRole1"},
        )
        role1_id = str(role1_response.json()["id"])

        role2_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "UserRole2"},
        )
        role2_id = str(role2_response.json()["id"])

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

    async def test_permission_sync_replaces_existing(self, client_with_db, db_controller):
        """Syncing permissions should replace existing permissions."""
        # Create roles
        role1_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "ReplaceRole1"},
        )
        role1_id = str(role1_response.json()["id"])

        role2_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "ReplaceRole2"},
        )
        role2_id = str(role2_response.json()["id"])

        role3_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "ReplaceRole3"},
        )
        role3_id = str(role3_response.json()["id"])

        # Create category
        cat_response = client_with_db.post(
            "/api/v0/category/create",
            json={"name": "ReplacePermCat"},
        )
        category_id = str(cat_response.json()["id"])

        # Initial sync
        await db_controller.sync_category_permissions(category_id, [role1_id, role2_id])

        # Replace with different roles
        await db_controller.sync_category_permissions(category_id, [role3_id])

        # Verify only new role is present
        db_category = await db_controller.get_category(category_id)
        assert db_category.role_ids == [role3_id]


class TestErrorCasesWithDB:
    """Tests for error cases with database integration."""

    async def test_delete_nonexistent_role(self, client_with_db, db_controller):
        """Deleting a non-existent role should handle gracefully."""
        # Try to delete role that doesn't exist in DB
        response = client_with_db.post(
            "/api/v0/role/delete",
            json={"id": 999999},
        )
        # API returns success because MockDiscordController always succeeds
        assert response.status_code == 200

        # Verify nothing in DB
        db_role = await db_controller.get_role("999999")
        assert db_role is None

    async def test_sync_permissions_nonexistent_channel(self, client_with_db, db_controller):
        """Syncing permissions on non-existent channel should raise error."""
        role_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "OrphanRole"},
        )
        role_id = str(role_response.json()["id"])

        with pytest.raises(Exception):
            await db_controller.sync_channel_permissions("nonexistent", [role_id])

    async def test_sync_user_roles_nonexistent_user(self, client_with_db, db_controller):
        """Syncing roles for non-existent user should raise error."""
        role_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "NoUserRole"},
        )
        role_id = str(role_response.json()["id"])

        with pytest.raises(Exception):
            await db_controller.sync_user_roles("nonexistent_user", [role_id])

    async def test_create_duplicate_user(self, client_with_db, db_controller):
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

    async def test_delete_category_removes_channel_permissions(
        self, client_with_db, db_controller
    ):
        """Deleting a category should also clean up channel permissions."""
        # Create role
        role_response = client_with_db.post(
            "/api/v0/role/create",
            json={"name": "CascadePermRole"},
        )
        role_id = str(role_response.json()["id"])

        # Create category and channel
        cat_response = client_with_db.post(
            "/api/v0/category/create",
            json={"name": "CascadeCategory"},
        )
        category_id = cat_response.json()["id"]

        ch_response = client_with_db.post(
            "/api/v0/channel/create",
            json={"name": "cascade-channel", "category_id": category_id},
        )
        channel_id = str(ch_response.json()["id"])

        # Sync permissions
        await db_controller.sync_channel_permissions(channel_id, [role_id])

        # Verify channel has permissions
        db_channel = await db_controller.get_channel(channel_id)
        assert len(db_channel.role_ids) == 1

        # Delete category
        delete_response = client_with_db.post(
            "/api/v0/category/delete",
            json={"id": category_id},
        )
        assert delete_response.status_code == 200

        # Verify channel is gone
        db_channel = await db_controller.get_channel(channel_id)
        assert db_channel is None
