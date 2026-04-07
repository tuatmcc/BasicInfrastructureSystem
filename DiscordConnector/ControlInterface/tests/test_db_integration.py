"""Tests for API endpoints with database integration."""


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
