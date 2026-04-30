import type { CategoryData, ChannelData, MemberData, MessageData, ReactionData, RoleData } from "../types";

export function roleResponse(role: RoleData) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    position: role.position,
  };
}

export function channelResponse(channel: ChannelData) {
  return {
    id: channel.id,
    name: channel.name,
    category_id: channel.categoryId,
    position: channel.position,
  };
}

export function categoryResponse(category: CategoryData) {
  return {
    id: category.id,
    name: category.name,
    position: category.position,
  };
}

export function memberResponse(member: MemberData) {
  return {
    id: member.id,
    name: member.name,
  };
}

export function messageResponse(message: MessageData) {
  return {
    id: message.id,
    content: message.content,
    author_id: message.authorId,
    channel_id: message.channelId,
  };
}

export function reactionResponse(reaction: ReactionData) {
  return {
    emoji: reaction.emoji,
    member_ids: reaction.memberIds,
    me: reaction.me,
    message_id: reaction.messageId,
  };
}
