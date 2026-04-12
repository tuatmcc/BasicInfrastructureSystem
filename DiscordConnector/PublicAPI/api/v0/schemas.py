"""Pydantic schemas for PublicAPI request/response models."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

Snowflake = Annotated[str, StringConstraints(pattern=r"^\d+$", strict=True)]


# Role schemas
class RoleCreate(BaseModel):
    name: str
    color: tuple[int, int, int] | None = None
    position: int | None = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Snowflake
    name: str
    color: tuple[int, int, int]
    position: int


class RoleDelete(BaseModel):
    id: Snowflake


# Channel schemas
class ChannelCreate(BaseModel):
    name: str
    category_id: Snowflake | None = None
    position: int | None = None


class ChannelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Snowflake
    name: str
    category_id: Snowflake | None
    position: int


class ChannelDelete(BaseModel):
    id: Snowflake


class ChannelListRoleQuery(BaseModel):
    channel_id: Snowflake


# Category schemas
class CategoryCreate(BaseModel):
    name: str
    position: int | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Snowflake
    name: str
    position: int


class CategoryDelete(BaseModel):
    id: Snowflake


# Member schemas
class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Snowflake
    name: str


class MemberBan(BaseModel):
    id: Snowflake


class MemberTimeout(BaseModel):
    id: Snowflake


# Message schemas
class MessageCreate(BaseModel):
    channel_id: Snowflake
    content: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Snowflake
    content: str
    author_id: Snowflake
    channel_id: Snowflake


class MessageDelete(BaseModel):
    channel_id: Snowflake
    message_id: Snowflake


# Reaction schemas
class ReactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    emoji: str
    member_ids: list[Snowflake]
    me: bool
    message_id: Snowflake


class ReactionQuery(BaseModel):
    channel_id: Snowflake
    message_id: Snowflake


# Generic response schemas
class SuccessResponse(BaseModel):
    success: bool


class ErrorResponse(BaseModel):
    error: str
