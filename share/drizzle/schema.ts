import { pgTable, pgPolicy, integer, text, timestamp, bigint, index, uniqueIndex, foreignKey, unique, uuid, boolean, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const grades = pgTable("grades", {
	id: integer().primaryKey().notNull(),
	displayGrade: text("display_grade").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	year: bigint({ mode: "number" }).default(sql`EXTRACT(year FROM CURRENT_DATE)`).notNull(),
}, (table) => [
	pgPolicy("authenticated user can read public.grades", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const users = pgTable("users", {
	discordUserId: text("discord_user_id"),
	displayName: text("display_name").notNull(),
	memberId: uuid("member_id"),
	authUserId: uuid("auth_user_id"),
	id: uuid().defaultRandom().primaryKey().notNull(),
}, (table) => [
	index("idx_users_member_id").using("btree", table.memberId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("users_auth_user_id_uidx").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")).where(sql`(auth_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.memberId],
			name: "users_member_id_fkey"
		}).onDelete("set null"),
	unique("users_auth_user_id_key").on(table.authUserId),
	pgPolicy("authenticated user can read own row", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const members = pgTable("members", {
	name: text().notNull(),
	grade: integer().notNull(),
	emergencyContact: text("emergency_contact").notNull(),
	studentId: text("student_id").notNull(),
	studentEmail: text("student_email").notNull(),
	insurance: boolean().default(false).notNull(),
	someAllergy: boolean("some_allergy").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	memberId: uuid("member_id").defaultRandom().primaryKey().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.grade],
			foreignColumns: [grades.id],
			name: "members_grade_fkey"
		}).onDelete("set null"),
	pgPolicy("admin user can read all rows", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("members_select_own_or_admin", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("members_update_own_or_admin", { as: "permissive", for: "update", to: ["public"] }),
]);

export const categories = pgTable("categories", {
	categoryId: uuid("category_id").defaultRandom().primaryKey().notNull(),
	categoryName: text("category_name").notNull(),
});

export const roles = pgTable("roles", {
	roleId: uuid("role_id").defaultRandom().primaryKey().notNull(),
	roleName: text("role_name").notNull(),
});

export const channels = pgTable("channels", {
	channelId: uuid("channel_id").defaultRandom().primaryKey().notNull(),
	channelName: text("channel_name").notNull(),
	categoryId: uuid("category_id"),
}, (table) => [
	index("idx_channels_category_id").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.categoryId],
			name: "channels_category_id_fkey"
		}).onDelete("cascade"),
]);

export const userRole = pgTable("user_role", {
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_role_user_id_fkey"
		}),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.roleId],
			name: "user_roles_role_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.roleId], name: "user_role_pkey"}),
]);

export const channelRole = pgTable("channel_role", {
	channelId: uuid("channel_id").notNull(),
	roleId: uuid("role_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [channels.channelId],
			name: "channel_role_access_channel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.roleId],
			name: "channel_role_access_role_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.channelId, table.roleId], name: "channel_role_access_pkey"}),
]);

export const categoryRole = pgTable("category_role", {
	categoryId: uuid("category_id").notNull(),
	roleId: uuid("role_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.categoryId],
			name: "category_role_access_category_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.roleId],
			name: "category_role_access_role_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.categoryId, table.roleId], name: "category_role_access_pkey"}),
]);
