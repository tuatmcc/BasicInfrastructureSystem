import { relations } from "drizzle-orm/relations";
import { grades, members, categories, channels, roles, userRole, channelRole, categoryRole } from "./schema";

export const membersRelations = relations(members, ({one}) => ({
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

export const userRoleRelations = relations(userRole, ({one}) => ({
	role: one(roles, {
		fields: [userRole.roleId],
		references: [roles.roleId]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRole),
	channelRoles: many(channelRole),
	categoryRoles: many(categoryRole),
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