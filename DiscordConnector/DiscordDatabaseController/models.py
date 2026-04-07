"""SQLAlchemy ORM models for DiscordDatabaseController."""

from sqlalchemy import Column, String, BigInteger, ForeignKey, Table
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


# Intermediate tables for many-to-many relationships

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("discord_user_id", String, ForeignKey("users.discord_user_id"), primary_key=True),
    Column("role_id", String, ForeignKey("roles.role_id"), primary_key=True),
)

category_role_access = Table(
    "category_role_access",
    Base.metadata,
    Column("category_id", String, ForeignKey("categories.category_id"), primary_key=True),
    Column("role_id", String, ForeignKey("roles.role_id"), primary_key=True),
)

channel_role_access = Table(
    "channel_role_access",
    Base.metadata,
    Column("channel_id", String, ForeignKey("channels.channel_id"), primary_key=True),
    Column("role_id", String, ForeignKey("roles.role_id"), primary_key=True),
)


class UserModel(Base):
    """User ORM model."""
    __tablename__ = "users"

    discord_user_id = Column(String, primary_key=True, index=True)
    display_name = Column(String, nullable=False)
    member_id = Column(String, nullable=True)

    roles = relationship("RoleModel", secondary=user_roles, back_populates="users")


class RoleModel(Base):
    """Role ORM model."""
    __tablename__ = "roles"

    role_id = Column(String, primary_key=True, index=True)
    role_name = Column(String, nullable=False)
    permissions = Column(BigInteger, nullable=False, default=0)

    users = relationship("UserModel", secondary=user_roles, back_populates="roles")
    categories = relationship("CategoryModel", secondary=category_role_access, back_populates="roles")
    channels = relationship("ChannelModel", secondary=channel_role_access, back_populates="roles")


class CategoryModel(Base):
    """Category ORM model."""
    __tablename__ = "categories"

    category_id = Column(String, primary_key=True, index=True)
    category_name = Column(String, nullable=False)

    channels = relationship("ChannelModel", back_populates="category", cascade="all, delete-orphan")
    roles = relationship("RoleModel", secondary=category_role_access, back_populates="categories")


class ChannelModel(Base):
    """Channel ORM model."""
    __tablename__ = "channels"

    channel_id = Column(String, primary_key=True, index=True)
    channel_name = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("categories.category_id"), nullable=False)

    category = relationship("CategoryModel", back_populates="channels")
    roles = relationship("RoleModel", secondary=channel_role_access, back_populates="channels")
