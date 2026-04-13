"""DiscordDatabaseController implementation."""

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from DiscordConnector.DiscordDatabaseController.database import Database
from DiscordConnector.DiscordDatabaseController.interface import (
    IDiscordDatabaseController,
    User,
    Role,
    Category,
    Channel,
    DatabaseError,
)
from DiscordConnector.DiscordDatabaseController.models import (
    CategoryModel,
    ChannelModel,
    RoleModel,
    UserModel,
)


class DiscordDatabaseController(IDiscordDatabaseController):
    """Database controller for Discord server state management."""

    def __init__(self, database_url: str):
        """Initialize controller with database URL."""
        self._db = Database(database_url)

    async def connect(self) -> None:
        """Initialize database connection and create tables."""
        await self._db.connect()

    async def disconnect(self) -> None:
        """Close database connection."""
        await self._db.disconnect()

    async def __aenter__(self) -> "DiscordDatabaseController":
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.disconnect()

    # Helper methods for conversion
    def _model_to_user(self, model: UserModel) -> User:
        return User(
            discord_user_id=model.discord_user_id,
            display_name=model.display_name,
            member_id=model.member_id,
            role_ids=[r.role_id for r in model.roles] if model.roles else None,
        )

    def _model_to_role(self, model: RoleModel) -> Role:
        return Role(
            role_id=model.role_id,
            role_name=model.role_name,
            permissions=0,
        )

    def _model_to_channel(self, model: ChannelModel) -> Channel:
        return Channel(
            channel_id=model.channel_id,
            channel_name=model.channel_name,
            category_id=model.category_id,
            role_ids=[r.role_id for r in model.roles] if model.roles else None,
        )

    def _model_to_category(self, model: CategoryModel) -> Category:
        return Category(
            category_id=model.category_id,
            category_name=model.category_name,
            channels=[self._model_to_channel(c) for c in model.channels] if model.channels else None,
            role_ids=[r.role_id for r in model.roles] if model.roles else None,
        )

    # User CRUD
    async def get_users(self, member_id: str | None = None) -> list[User]:
        async with self._db.session() as session:
            query = select(UserModel).options(joinedload(UserModel.roles))
            if member_id:
                query = query.filter(UserModel.member_id == member_id)
            result = await session.execute(query)
            users = result.unique().scalars().all()
            return [self._model_to_user(u) for u in users]

    async def get_user(self, discord_user_id: str) -> User | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(UserModel)
                .options(joinedload(UserModel.roles))
                .filter(UserModel.discord_user_id == discord_user_id)
            )
            user = result.unique().scalar_one_or_none()
            return self._model_to_user(user) if user else None

    async def create_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User:
        async with self._db.session() as session:
            # Check if user already exists
            existing = await session.execute(
                select(UserModel).filter(UserModel.discord_user_id == discord_user_id)
            )
            if existing.scalar_one_or_none():
                raise DatabaseError(f"User {discord_user_id} already exists")

            user = UserModel(
                discord_user_id=discord_user_id,
                display_name=display_name,
                member_id=member_id,
            )
            session.add(user)
            await session.flush()
            # Return without accessing roles (new user has no roles)
            return User(
                discord_user_id=user.discord_user_id,
                display_name=user.display_name,
                member_id=user.member_id,
                role_ids=[],
            )

    async def update_user(
        self,
        discord_user_id: str,
        display_name: str,
        member_id: str | None = None,
    ) -> User | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(UserModel)
                .options(joinedload(UserModel.roles))
                .filter(UserModel.discord_user_id == discord_user_id)
            )
            user = result.unique().scalar_one_or_none()
            if not user:
                return None

            user.display_name = display_name
            user.member_id = member_id
            await session.flush()
            return self._model_to_user(user)

    async def delete_user(self, discord_user_id: str) -> bool:
        async with self._db.session() as session:
            result = await session.execute(
                select(UserModel).filter(UserModel.discord_user_id == discord_user_id)
            )
            user = result.scalar_one_or_none()
            if not user:
                return False

            await session.delete(user)
            return True

    async def sync_user_roles(
        self,
        discord_user_id: str,
        role_ids: list[str],
    ) -> int:
        async with self._db.session() as session:
            result = await session.execute(
                select(UserModel)
                .options(joinedload(UserModel.roles))
                .filter(UserModel.discord_user_id == discord_user_id)
            )
            user = result.unique().scalar_one_or_none()
            if not user:
                raise DatabaseError(f"User {discord_user_id} not found")

            # Get roles
            roles_result = await session.execute(
                select(RoleModel).filter(RoleModel.role_id.in_(role_ids))
            )
            roles = roles_result.scalars().all()

            user.roles = list(roles)
            return len(roles)

    # Role CRUD
    async def get_roles(self) -> list[Role]:
        async with self._db.session() as session:
            result = await session.execute(select(RoleModel))
            roles = result.scalars().all()
            return [self._model_to_role(r) for r in roles]

    async def get_role(self, role_id: str) -> Role | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(RoleModel).filter(RoleModel.role_id == role_id)
            )
            role = result.scalar_one_or_none()
            return self._model_to_role(role) if role else None

    async def create_role(
        self,
        role_id: str,
        role_name: str,
        permissions: int,
    ) -> Role:
        async with self._db.session() as session:
            role = RoleModel(
                role_id=role_id,
                role_name=role_name,
            )
            session.add(role)
            await session.flush()
            return Role(
                role_id=role.role_id,
                role_name=role.role_name,
                permissions=permissions,
            )

    async def update_role(
        self,
        role_id: str,
        role_name: str | None = None,
        permissions: int | None = None,
    ) -> Role | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(RoleModel).filter(RoleModel.role_id == role_id)
            )
            role = result.scalar_one_or_none()
            if not role:
                return None

            if role_name is not None:
                role.role_name = role_name
            await session.flush()
            return Role(
                role_id=role.role_id,
                role_name=role.role_name,
                permissions=permissions if permissions is not None else 0,
            )

    async def delete_role(self, role_id: str) -> bool:
        async with self._db.session() as session:
            result = await session.execute(
                select(RoleModel).filter(RoleModel.role_id == role_id)
            )
            role = result.scalar_one_or_none()
            if not role:
                return False

            await session.delete(role)
            return True

    # Category CRUD
    async def get_categories(self) -> list[Category]:
        async with self._db.session() as session:
            result = await session.execute(
                select(CategoryModel).options(
                    joinedload(CategoryModel.channels).joinedload(ChannelModel.roles),
                    joinedload(CategoryModel.roles),
                )
            )
            categories = result.unique().scalars().all()
            return [self._model_to_category(c) for c in categories]

    async def get_category(self, category_id: str) -> Category | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(CategoryModel)
                .options(
                    joinedload(CategoryModel.channels).joinedload(ChannelModel.roles),
                    joinedload(CategoryModel.roles),
                )
                .filter(CategoryModel.category_id == category_id)
            )
            category = result.unique().scalar_one_or_none()
            return self._model_to_category(category) if category else None

    async def create_category(
        self,
        category_id: str,
        category_name: str,
    ) -> Category:
        async with self._db.session() as session:
            category = CategoryModel(
                category_id=category_id,
                category_name=category_name,
            )
            session.add(category)
            await session.flush()
            return Category(
                category_id=category.category_id,
                category_name=category.category_name,
                channels=[],
                role_ids=[],
            )

    async def delete_category(self, category_id: str) -> bool:
        async with self._db.session() as session:
            result = await session.execute(
                select(CategoryModel).filter(CategoryModel.category_id == category_id)
            )
            category = result.scalar_one_or_none()
            if not category:
                return False

            await session.delete(category)
            return True

    async def sync_category_permissions(
        self,
        category_id: str,
        role_ids: list[str],
    ) -> int:
        async with self._db.session() as session:
            result = await session.execute(
                select(CategoryModel)
                .options(joinedload(CategoryModel.roles))
                .filter(CategoryModel.category_id == category_id)
            )
            category = result.unique().scalar_one_or_none()
            if not category:
                raise DatabaseError(f"Category {category_id} not found")

            roles_result = await session.execute(
                select(RoleModel).filter(RoleModel.role_id.in_(role_ids))
            )
            roles = roles_result.scalars().all()

            category.roles = list(roles)
            return len(roles)

    # Channel CRUD
    async def get_channels(self) -> list[Channel]:
        async with self._db.session() as session:
            result = await session.execute(
                select(ChannelModel).options(joinedload(ChannelModel.roles))
            )
            channels = result.unique().scalars().all()
            return [self._model_to_channel(c) for c in channels]

    async def get_channel(self, channel_id: str) -> Channel | None:
        async with self._db.session() as session:
            result = await session.execute(
                select(ChannelModel)
                .options(joinedload(ChannelModel.roles))
                .filter(ChannelModel.channel_id == channel_id)
            )
            channel = result.unique().scalar_one_or_none()
            return self._model_to_channel(channel) if channel else None

    async def create_channel(
        self,
        channel_id: str,
        channel_name: str,
        category_id: str,
        allowed_role_ids: list[str] | None = None,
    ) -> Channel:
        async with self._db.session() as session:
            # Verify category exists
            cat_result = await session.execute(
                select(CategoryModel).filter(CategoryModel.category_id == category_id)
            )
            if not cat_result.scalar_one_or_none():
                raise DatabaseError(f"Category {category_id} not found")

            channel = ChannelModel(
                channel_id=channel_id,
                channel_name=channel_name,
                category_id=category_id,
            )

            role_ids_result: list[str] = []
            if allowed_role_ids:
                roles_result = await session.execute(
                    select(RoleModel).filter(RoleModel.role_id.in_(allowed_role_ids))
                )
                roles = list(roles_result.scalars().all())
                channel.roles = roles
                role_ids_result = [r.role_id for r in roles]

            session.add(channel)
            await session.flush()
            return Channel(
                channel_id=channel.channel_id,
                channel_name=channel.channel_name,
                category_id=channel.category_id,
                role_ids=role_ids_result,
            )

    async def delete_channel(self, channel_id: str) -> bool:
        async with self._db.session() as session:
            result = await session.execute(
                select(ChannelModel).filter(ChannelModel.channel_id == channel_id)
            )
            channel = result.scalar_one_or_none()
            if not channel:
                return False

            await session.delete(channel)
            return True

    async def sync_channel_permissions(
        self,
        channel_id: str,
        role_ids: list[str],
    ) -> int:
        async with self._db.session() as session:
            result = await session.execute(
                select(ChannelModel)
                .options(joinedload(ChannelModel.roles))
                .filter(ChannelModel.channel_id == channel_id)
            )
            channel = result.unique().scalar_one_or_none()
            if not channel:
                raise DatabaseError(f"Channel {channel_id} not found")

            roles_result = await session.execute(
                select(RoleModel).filter(RoleModel.role_id.in_(role_ids))
            )
            roles = roles_result.scalars().all()

            channel.roles = list(roles)
            return len(roles)
