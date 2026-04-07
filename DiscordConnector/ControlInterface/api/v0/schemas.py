from pydantic import BaseModel


# Role schemas
class RoleCreate(BaseModel):
    name: str
    color: tuple[int, int, int] | None = None
    position: int | None = None


class RoleResponse(BaseModel):
    id: int
    name: str
    color: tuple[int, int, int]
    position: int

    class Config:
        from_attributes = True


class RoleDelete(BaseModel):
    id: int


# Channel schemas
class ChannelCreate(BaseModel):
    name: str
    category_id: int | None = None
    position: int | None = None


class ChannelResponse(BaseModel):
    id: int
    name: str
    category_id: int
    position: int

    class Config:
        from_attributes = True


class ChannelDelete(BaseModel):
    id: int


class ChannelListRoleQuery(BaseModel):
    channel_id: int


# Category schemas
class CategoryCreate(BaseModel):
    name: str
    position: int | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    position: int

    class Config:
        from_attributes = True


class CategoryDelete(BaseModel):
    id: int


# Member schemas
class MemberResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class MemberBan(BaseModel):
    id: int


class MemberTimeout(BaseModel):
    id: int


# Message schemas
class MessageCreate(BaseModel):
    channel_id: int
    content: str


class MessageResponse(BaseModel):
    id: int
    content: str
    author_id: int
    channel_id: int

    class Config:
        from_attributes = True


class MessageDelete(BaseModel):
    channel_id: int
    message_id: int


# Reaction schemas
class ReactionResponse(BaseModel):
    emoji: str
    member_ids: list[int]
    me: bool
    message_id: int

    class Config:
        from_attributes = True


class ReactionQuery(BaseModel):
    channel_id: int
    message_id: int


# Generic response schemas
class SuccessResponse(BaseModel):
    success: bool


class ErrorResponse(BaseModel):
    error: str
