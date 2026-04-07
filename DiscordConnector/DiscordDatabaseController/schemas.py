"""Pydantic schemas for DiscordDatabaseController."""

from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    """Base role schema."""
    role_id: str
    role_name: str
    permissions: int


class RoleCreate(RoleBase):
    """Schema for creating a role."""
    pass


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    role_name: str | None = None
    permissions: int | None = None


class Role(RoleBase):
    """Role response schema."""
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    """Base user schema."""
    discord_user_id: str
    display_name: str
    member_id: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user."""
    pass


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    display_name: str | None = None
    member_id: str | None = None


class User(UserBase):
    """User response schema."""
    roles: list[Role] = []
    model_config = ConfigDict(from_attributes=True)


class ChannelBase(BaseModel):
    """Base channel schema."""
    channel_id: str
    channel_name: str
    category_id: str


class ChannelCreate(ChannelBase):
    """Schema for creating a channel."""
    allowed_role_ids: list[str] = []


class Channel(ChannelBase):
    """Channel response schema."""
    roles: list[Role] = []
    model_config = ConfigDict(from_attributes=True)


class CategoryBase(BaseModel):
    """Base category schema."""
    category_id: str
    category_name: str


class CategoryCreate(CategoryBase):
    """Schema for creating a category."""
    pass


class Category(CategoryBase):
    """Category response schema."""
    channels: list[Channel] = []
    roles: list[Role] = []
    model_config = ConfigDict(from_attributes=True)


class PermissionSync(BaseModel):
    """Schema for syncing permissions."""
    role_ids: list[str]


class RoleSyncResult(BaseModel):
    """Result of a role sync operation."""
    synced_roles_count: int
