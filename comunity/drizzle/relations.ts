import { relations } from "drizzle-orm/relations";
import { usersInAuth, users, members, grades, categories, channels, categoryRole, roles, channelRole, userRole } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [users.authUserId],
		references: [usersInAuth.id]
	}),
	member: one(members, {
		fields: [users.memberId],
		references: [members.memberId]
	}),
	userRoles: many(userRole),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	users: many(users),
}));

export const membersRelations = relations(members, ({one, many}) => ({
	users: many(users),
	grade: one(grades, {
		fields: [members.grade],
		references: [grades.id]
	}),
}));

export const gradesRelations = relations(grades, ({many}) => ({
	members: many(members),
}));

export const channelsRelations = relations(channels, ({one, many}) => ({
	category: one(categories, {
		fields: [channels.categoryId],
		references: [categories.categoryId]
	}),
	channelRoles: many(channelRole),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	channels: many(channels),
	categoryRoles: many(categoryRole),
}));

export const categoryRoleRelations = relations(categoryRole, ({one}) => ({
	category: one(categories, {
		fields: [categoryRole.categoryId],
		references: [categories.categoryId]
	}),
	role: one(roles, {
		fields: [categoryRole.roleId],
		references: [roles.roleId]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	categoryRoles: many(categoryRole),
	channelRoles: many(channelRole),
	userRoles: many(userRole),
}));

export const channelRoleRelations = relations(channelRole, ({one}) => ({
	channel: one(channels, {
		fields: [channelRole.channelId],
		references: [channels.channelId]
	}),
	role: one(roles, {
		fields: [channelRole.roleId],
		references: [roles.roleId]
	}),
}));

export const userRoleRelations = relations(userRole, ({one}) => ({
	user: one(users, {
		fields: [userRole.discordUserId],
		references: [users.discordUserId]
	}),
	role: one(roles, {
		fields: [userRole.roleId],
		references: [roles.roleId]
	}),
}));