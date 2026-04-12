"""Integration tests for the complete Discord management system.

These tests verify the full flow: MockDiscordController → API → Database
"""

import pytest


class TestRoleLifecycle:
    """Test role lifecycle: create → verify in DB → delete → verify removed."""

    async def test_create_role_syncs_to_db(self, integration_context):
        """Creating a role via API should persist it to the database."""
        ctx = integration_context

        # Create role via API
        response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "IntegrationTestRole", "color": [100, 150, 200], "position": 3},
        )
        assert response.status_code == 200
        role_data = response.json()
        role_id = str(role_data["id"])

        # Verify role is saved to database
        db_role = await ctx.db.get_role(role_id)
        assert db_role is not None
        assert db_role.role_name == "IntegrationTestRole"

    async def test_delete_role_removes_from_db(self, integration_context):
        """Deleting a role via API should remove it from the database."""
        ctx = integration_context

        # Create role first
        create_response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "RoleToDelete"},
        )
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]

        # Verify it exists in DB
        db_role = await ctx.db.get_role(str(role_id))
        assert db_role is not None

        # Delete role via API
        delete_response = await ctx.api.post(
            "/api/v0/role/delete",
            json={"id": role_id},
        )
        assert delete_response.status_code == 200

        # Verify it's removed from DB
        db_role = await ctx.db.get_role(str(role_id))
        assert db_role is None

    async def test_list_roles_includes_db_roles(self, integration_context):
        """Listing roles should include roles stored in database."""
        ctx = integration_context

        # Create multiple roles
        role_names = ["Role1", "Role2", "Role3"]
        created_ids = []
        for name in role_names:
            response = await ctx.api.post(
                "/api/v0/role/create",
                json={"name": name},
            )
            assert response.status_code == 200
            created_ids.append(response.json()["id"])

        # Get roles from DB
        db_roles = await ctx.db.get_roles()
        db_role_ids = [r.role_id for r in db_roles]

        # Verify all created roles are in DB
        for role_id in created_ids:
            assert str(role_id) in db_role_ids


class TestChannelLifecycle:
    """Test channel lifecycle with category and permission handling."""

    async def test_create_channel_with_category_syncs_to_db(self, integration_context):
        """Creating a channel with category should persist both to DB."""
        ctx = integration_context

        # Create category first
        cat_response = await ctx.api.post(
            "/api/v0/category/create",
            json={"name": "TestCategory", "position": 1},
        )
        assert cat_response.status_code == 200
        category_id = cat_response.json()["id"]

        # Verify category in DB
        db_category = await ctx.db.get_category(str(category_id))
        assert db_category is not None
        assert db_category.category_name == "TestCategory"

        # Create channel in category
        ch_response = await ctx.api.post(
            "/api/v0/channel/create",
            json={"name": "test-channel", "category_id": category_id},
        )
        assert ch_response.status_code == 200
        channel_id = ch_response.json()["id"]

        # Verify channel in DB
        db_channel = await ctx.db.get_channel(str(channel_id))
        assert db_channel is not None
        assert db_channel.channel_name == "test-channel"
        assert db_channel.category_id == str(category_id)

    async def test_delete_category_cascades_to_channels(self, integration_context):
        """Deleting a category should also remove its channels from DB."""
        ctx = integration_context

        # Create category
        cat_response = await ctx.api.post(
            "/api/v0/category/create",
            json={"name": "CascadeTestCategory"},
        )
        assert cat_response.status_code == 200
        category_id = cat_response.json()["id"]

        # Create channels in category
        channel_ids = []
        for i in range(3):
            ch_response = await ctx.api.post(
                "/api/v0/channel/create",
                json={"name": f"cascade-channel-{i}", "category_id": category_id},
            )
            assert ch_response.status_code == 200
            channel_ids.append(ch_response.json()["id"])

        # Verify channels exist
        for ch_id in channel_ids:
            db_channel = await ctx.db.get_channel(str(ch_id))
            assert db_channel is not None

        # Delete category
        delete_response = await ctx.api.post(
            "/api/v0/category/delete",
            json={"id": category_id},
        )
        assert delete_response.status_code == 200

        # Verify category removed
        db_category = await ctx.db.get_category(str(category_id))
        assert db_category is None

        # Verify channels also removed
        for ch_id in channel_ids:
            db_channel = await ctx.db.get_channel(str(ch_id))
            assert db_channel is None


class TestMemberManagement:
    """Test member management flow with role assignments."""

    async def test_list_members_returns_discord_members(self, integration_context):
        """Listing members should return members from Discord (mock)."""
        ctx = integration_context

        response = await ctx.api.get("/api/v0/member/list")
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        assert len(members) > 0

    async def test_member_role_sync_persists_to_db(self, integration_context):
        """Assigning roles to a member should sync to database."""
        ctx = integration_context

        # Create roles
        role_ids = []
        for name in ["MemberRole1", "MemberRole2"]:
            response = await ctx.api.post(
                "/api/v0/role/create",
                json={"name": name},
            )
            assert response.status_code == 200
            role_ids.append(str(response.json()["id"]))

        # Get a member from the list
        members_response = await ctx.api.get("/api/v0/member/list")
        assert members_response.status_code == 200
        members = members_response.json()
        assert len(members) > 0
        member_id = str(members[0]["id"])

        # Create user in DB (simulating sync)
        await ctx.db.create_user(
            discord_user_id=member_id,
            display_name=members[0]["name"],
        )

        # Sync roles to user
        sync_count = await ctx.db.sync_user_roles(member_id, role_ids)
        assert sync_count == len(role_ids)

        # Verify roles are assigned
        db_user = await ctx.db.get_user(member_id)
        assert db_user is not None
        assert set(db_user.role_ids) == set(role_ids)


class TestComplexScenarios:
    """Test complex multi-step scenarios."""

    async def test_full_server_setup_flow(self, integration_context):
        """Test complete server setup: roles → categories → channels → permissions."""
        ctx = integration_context

        # Step 1: Create roles
        admin_response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "Admin", "color": [255, 0, 0], "position": 10},
        )
        assert admin_response.status_code == 200
        admin_role_id = str(admin_response.json()["id"])

        mod_response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "Moderator", "color": [0, 255, 0], "position": 5},
        )
        assert mod_response.status_code == 200
        mod_role_id = str(mod_response.json()["id"])

        member_response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "Member", "color": [0, 0, 255], "position": 1},
        )
        assert member_response.status_code == 200
        member_role_id = str(member_response.json()["id"])

        # Step 2: Create categories
        text_cat_response = await ctx.api.post(
            "/api/v0/category/create",
            json={"name": "Text Channels", "position": 1},
        )
        assert text_cat_response.status_code == 200
        text_category_id = text_cat_response.json()["id"]

        admin_cat_response = await ctx.api.post(
            "/api/v0/category/create",
            json={"name": "Admin Only", "position": 2},
        )
        assert admin_cat_response.status_code == 200
        admin_category_id = admin_cat_response.json()["id"]

        # Step 3: Create channels
        general_response = await ctx.api.post(
            "/api/v0/channel/create",
            json={"name": "general", "category_id": text_category_id},
        )
        assert general_response.status_code == 200
        general_channel_id = str(general_response.json()["id"])

        admin_ch_response = await ctx.api.post(
            "/api/v0/channel/create",
            json={"name": "admin-chat", "category_id": admin_category_id},
        )
        assert admin_ch_response.status_code == 200
        admin_channel_id = str(admin_ch_response.json()["id"])

        # Step 4: Sync permissions
        # General channel: all roles can access
        all_roles = [admin_role_id, mod_role_id, member_role_id]
        general_sync = await ctx.db.sync_channel_permissions(general_channel_id, all_roles)
        assert general_sync == 3

        # Admin channel: only admin and mod
        admin_roles = [admin_role_id, mod_role_id]
        admin_sync = await ctx.db.sync_channel_permissions(admin_channel_id, admin_roles)
        assert admin_sync == 2

        # Step 5: Verify final state
        db_roles = await ctx.db.get_roles()
        assert len(db_roles) == 3

        db_categories = await ctx.db.get_categories()
        assert len(db_categories) == 2

        db_channels = await ctx.db.get_channels()
        assert len(db_channels) == 2

        # Verify channel permissions
        general_ch = await ctx.db.get_channel(general_channel_id)
        assert len(general_ch.role_ids) == 3

        admin_ch = await ctx.db.get_channel(admin_channel_id)
        assert len(admin_ch.role_ids) == 2
        assert member_role_id not in admin_ch.role_ids

    async def test_role_deletion_updates_permissions(self, integration_context):
        """Deleting a role should remove it from all permission assignments."""
        ctx = integration_context

        # Create role
        role_response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "TempRole"},
        )
        assert role_response.status_code == 200
        role_id = str(role_response.json()["id"])

        # Create category and channel
        cat_response = await ctx.api.post(
            "/api/v0/category/create",
            json={"name": "TestCat"},
        )
        assert cat_response.status_code == 200
        category_id = cat_response.json()["id"]

        ch_response = await ctx.api.post(
            "/api/v0/channel/create",
            json={"name": "test-ch", "category_id": category_id},
        )
        assert ch_response.status_code == 200
        channel_id = str(ch_response.json()["id"])

        # Assign role to channel
        await ctx.db.sync_channel_permissions(channel_id, [role_id])

        # Verify role is assigned
        channel = await ctx.db.get_channel(channel_id)
        assert role_id in channel.role_ids

        # Delete role
        delete_response = await ctx.api.post(
            "/api/v0/role/delete",
            json={"id": role_id},
        )
        assert delete_response.status_code == 200

        # Verify role is removed from channel permissions
        channel = await ctx.db.get_channel(channel_id)
        assert channel.role_ids is None or role_id not in channel.role_ids


class TestDataConsistency:
    """Test data consistency between Discord (mock) and database."""

    async def test_api_and_db_roles_match(self, integration_context):
        """Roles created via API should be consistent in both API response and DB."""
        ctx = integration_context

        # Create role
        response = await ctx.api.post(
            "/api/v0/role/create",
            json={"name": "ConsistencyRole", "color": [128, 128, 128], "position": 5},
        )
        assert response.status_code == 200
        api_role = response.json()

        # Get from DB
        db_role = await ctx.db.get_role(str(api_role["id"]))
        assert db_role is not None

        # Verify consistency
        assert db_role.role_id == str(api_role["id"])
        assert db_role.role_name == api_role["name"]

    async def test_multiple_operations_maintain_consistency(self, integration_context):
        """Multiple create/delete operations should maintain data consistency."""
        ctx = integration_context

        created_roles = []

        # Create 5 roles
        for i in range(5):
            response = await ctx.api.post(
                "/api/v0/role/create",
                json={"name": f"BatchRole{i}"},
            )
            assert response.status_code == 200
            created_roles.append(response.json())

        # Verify all in DB
        db_roles = await ctx.db.get_roles()
        assert len(db_roles) >= 5

        # Delete 2 roles
        for role in created_roles[:2]:
            delete_response = await ctx.api.post(
                "/api/v0/role/delete",
                json={"id": role["id"]},
            )
            assert delete_response.status_code == 200

        # Verify remaining roles in DB
        db_roles = await ctx.db.get_roles()
        db_role_ids = [r.role_id for r in db_roles]

        for role in created_roles[2:]:
            assert str(role["id"]) in db_role_ids

        for role in created_roles[:2]:
            assert str(role["id"]) not in db_role_ids
