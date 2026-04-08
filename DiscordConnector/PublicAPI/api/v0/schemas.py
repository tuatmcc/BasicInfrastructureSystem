"""Pydantic schemas for PublicAPI request/response models."""

from pydantic import BaseModel, ConfigDict


# Role schemas
class RoleCreate(BaseModel):
    name: str
    color: tuple[int, int, int] | None = None
    position: int | None = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: tuple[int, int, int]
    position: int


class RoleDelete(BaseModel):
    id: int


# Channel schemas
class ChannelCreate(BaseModel):
    name: str
    category_id: int | None = None
    position: int | None = None


class ChannelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category_id: int
    position: int


class ChannelDelete(BaseModel):
    id: int


class ChannelListRoleQuery(BaseModel):
    channel_id: int


# Category schemas
class CategoryCreate(BaseModel):
    name: str
    position: int | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    position: int


class CategoryDelete(BaseModel):
    id: int


# Member schemas
class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MemberBan(BaseModel):
    id: int


class MemberTimeout(BaseModel):
    id: int


# Message schemas
class MessageCreate(BaseModel):
    channel_id: int
    content: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    author_id: int
    channel_id: int


class MessageDelete(BaseModel):
    channel_id: int
    message_id: int


# Reaction schemas
class ReactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    emoji: str
    member_ids: list[int]
    me: bool
    message_id: int


class ReactionQuery(BaseModel):
    channel_id: int
    message_id: int


# Generic response schemas
class SuccessResponse(BaseModel):
    success: bool


class ErrorResponse(BaseModel):
    error: str
