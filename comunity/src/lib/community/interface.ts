export interface community {
  createRole();
  deleteRole();
  listRoles();
  listRoleMembers();
  createChannel();
  deleteChannel();
  listChannels() ;
  listChannelRoles();
  createCategory();
  deleteCategory();
  listCategories();
  listMembers();
  listMemberRoles();
  banMember();
  kickMember();
  createMessage();
  deleteMessage();
  totalReactions();
}