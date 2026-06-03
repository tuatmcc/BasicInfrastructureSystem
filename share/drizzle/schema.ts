import { pgTable, text, uuid, integer, timestamp, bigint, boolean, foreignKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// --- Better Auth Tables ---

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
    
    // Custom fields integrated from previous architecture
	discordUserId: text("discord_user_id"),
	displayName: text("display_name"),
	memberId: uuid("member_id"),
    role: text("role").default("user").notNull(), // Added role for RBAC
}, (table) => [
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.memberId],
			name: "user_member_id_fkey"
		}).onDelete("set null"),
]);

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
});

// --- Application Tables ---

export const grades = pgTable("grades", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "grades_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	displayGrade: text("display_grade").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	year: bigint({ mode: "number" }).default(sql`EXTRACT(year FROM CURRENT_DATE)`).notNull(),
});

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
]);
