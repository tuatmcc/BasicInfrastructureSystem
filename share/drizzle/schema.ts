import { sql } from "drizzle-orm"
import {
	bigint,
	boolean,
	check,
	foreignKey,
	index,
	integer,
	pgSchema,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	type AnyPgColumn,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core"

export const memberStatusValues = ["pending", "active", "rejected", "withdrawn"] as const
export type MemberStatus = typeof memberStatusValues[number]

// --- Better Auth Tables ---
//
// These live in their own schema and hold no domain column, so the
// authentication store can be moved to its own database. Nothing here may
// reference an application table: see app_accounts below for the link, and
// supabase/migrations/20260727000000_split_auth_schema.sql for the boundary.

export const appAuth = pgSchema("app_auth")

export const user = appAuth.table("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
})

export const session = appAuth.table("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
	index("session_user_id_expires_at_idx").on(table.userId, table.expiresAt.desc()),
	index("session_expires_at_idx").on(table.expiresAt),
])

export const account = appAuth.table("account", {
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
}, (table) => [
	unique("account_provider_account_unique").on(table.providerId, table.accountId),
	index("account_user_id_idx").on(table.userId),
])

export const verification = appAuth.table("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
}, (table) => [
	index("verification_identifier_expires_at_idx").on(table.identifier, table.expiresAt),
])

// --- Application Tables ---

// The domain's own record of an authentication subject, and the only thing that
// links the two sides. userId is an opaque identifier rather than a foreign key
// so the authentication store stays movable.
export const appAccounts = pgTable("app_accounts", {
	userId: text("user_id").primaryKey(),
	memberId: uuid("member_id"),
	role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.memberId],
		foreignColumns: [members.memberId],
		name: "app_accounts_member_id_fkey",
	}).onDelete("set null"),
	unique("app_accounts_member_id_key").on(table.memberId),
	check("app_accounts_role_valid", sql`${table.role} in ('user', 'admin')`),
	check("app_accounts_user_id_not_blank", sql`btrim(${table.userId}) <> ''`),
	index("app_accounts_member_id_idx").on(table.memberId),
])

export const grades = pgTable("grades", {
	id: integer("id").primaryKey(),
	code: text("code").notNull(),
	displayGrade: text("display_grade").notNull(),
	sortOrder: smallint("sort_order").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	unique("grades_code_key").on(table.code),
	unique("grades_display_grade_key").on(table.displayGrade),
	unique("grades_sort_order_key").on(table.sortOrder),
	check("grades_code_not_blank", sql`btrim(${table.code}) <> ''`),
	check("grades_display_not_blank", sql`btrim(${table.displayGrade}) <> ''`),
])

export const members = pgTable("members", {
	memberId: uuid("member_id").defaultRandom().primaryKey().notNull(),
	// Keep the legacy TypeScript property names while mapping to the canonical columns.
	name: text("registered_name").notNull(),
	grade: integer("grade_id").notNull(),
	emergencyContact: text("emergency_contact").notNull(),
	studentId: text("student_id").notNull(),
	studentEmail: text("student_email").notNull(),
	insurance: boolean("insurance").default(false).notNull(),
	someAllergy: boolean("some_allergy").default(false).notNull(),
	allergyDetails: text("allergy_details"),
	memberStatus: text("member_status", {
		enum: memberStatusValues,
	}).$type<MemberStatus>().default("pending").notNull(),
	applicationVersion: integer("application_version").default(1).notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
	// Reviewer identity snapshot. Not a foreign key: the authentication store
	// may move to its own database.
	reviewedByUserId: text("reviewed_by_user_id"),
	reviewReason: text("review_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.grade],
		foreignColumns: [grades.id],
		name: "members_grade_id_fkey",
	}).onDelete("restrict"),
	check("members_registered_name_format", sql`
		${table.name} = btrim(${table.name})
		and char_length(${table.name}) between 1 and 200
	`),
	check("members_emergency_contact_format", sql`
		${table.emergencyContact} = btrim(${table.emergencyContact})
		and char_length(${table.emergencyContact}) between 1 and 500
	`),
	check("members_student_id_normalized", sql`
		${table.studentId} = upper(btrim(${table.studentId}))
		and char_length(${table.studentId}) between 1 and 64
	`),
	check("members_student_email_normalized", sql`
		${table.studentEmail} = lower(btrim(${table.studentEmail}))
		and char_length(${table.studentEmail}) <= 320
		and ${table.studentEmail} ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
	`),
	check("members_allergy_details_length", sql`
		${table.allergyDetails} is null or char_length(${table.allergyDetails}) <= 2000
	`),
	check("members_status_valid", sql`
		${table.memberStatus} in ('pending', 'active', 'rejected', 'withdrawn')
	`),
	check("members_application_version_positive", sql`${table.applicationVersion} > 0`),
	check("members_rejection_reason_required", sql`
		${table.memberStatus} <> 'rejected'
		or btrim(coalesce(${table.reviewReason}, '')) <> ''
	`),
	check("members_review_timestamp_required", sql`
		${table.memberStatus} not in ('active', 'rejected') or ${table.reviewedAt} is not null
	`),
	uniqueIndex("members_student_id_unique").on(table.studentId),
	uniqueIndex("members_student_email_unique").on(table.studentEmail),
	index("members_grade_id_idx").on(table.grade),
	index("members_status_submitted_idx").on(table.memberStatus, table.submittedAt.desc(), table.memberId),
	index("members_reviewed_by_user_id_idx").on(table.reviewedByUserId),
])

export const memberDirectoryProfiles = pgTable("member_directory_profiles", {
	memberId: uuid("member_id").primaryKey(),
	displayName: text("display_name").notNull(),
	skills: text("skills").array().default(sql`ARRAY[]::text[]`).notNull(),
	interests: text("interests").array().default(sql`ARRAY[]::text[]`).notNull(),
	currentActivities: text("current_activities").default("").notNull(),
	bio: text("bio").default("").notNull(),
	directoryVisible: boolean("directory_visible").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.memberId],
		foreignColumns: [members.memberId],
		name: "member_directory_profiles_member_id_fkey",
	}).onDelete("cascade"),
	check("member_directory_display_name_format", sql`
		${table.displayName} = btrim(${table.displayName})
		and char_length(${table.displayName}) between 1 and 100
	`),
	check("member_directory_skills_limit", sql`cardinality(${table.skills}) <= 30`),
	check("member_directory_interests_limit", sql`cardinality(${table.interests}) <= 30`),
	check("member_directory_activities_length", sql`char_length(${table.currentActivities}) <= 2000`),
	check("member_directory_bio_length", sql`char_length(${table.bio}) <= 2000`),
])

export const communityIdentities = pgTable("community_identities", {
	identityId: uuid("identity_id").defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	authAccountId: text("auth_account_id").notNull().unique("community_identities_auth_account_id_key"),
	provider: text("provider").notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	username: text("username").notNull(),
	providerDisplayName: text("provider_display_name"),
	avatarUrl: text("avatar_url"),
	oauthVerifiedAt: timestamp("oauth_verified_at", { withTimezone: true, mode: "string" }).notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	check("community_identities_provider_not_blank", sql`btrim(${table.provider}) <> ''`),
	check("community_identities_account_not_blank", sql`btrim(${table.providerAccountId}) <> ''`),
	check("community_identities_username_not_blank", sql`btrim(${table.username}) <> ''`),
	unique("community_identities_user_provider_unique").on(table.userId, table.provider),
	unique("community_identities_provider_account_unique").on(table.provider, table.providerAccountId),
	index("community_identities_user_id_idx").on(table.userId),
])

export const communityMemberships = pgTable("community_memberships", {
	identityId: uuid("identity_id").notNull(),
	communityId: text("community_id").notNull(),
	membershipStatus: text("membership_status", {
		enum: ["member", "not_member", "unknown"],
	}).default("unknown").notNull(),
	nickname: text("nickname"),
	roleIds: text("role_ids").array().default(sql`ARRAY[]::text[]`).notNull(),
	roleNames: text("role_names").array().default(sql`ARRAY[]::text[]`).notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
	lastCheckedAt: timestamp("last_checked_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	primaryKey({ name: "community_memberships_pkey", columns: [table.identityId, table.communityId] }),
	foreignKey({
		columns: [table.identityId],
		foreignColumns: [communityIdentities.identityId],
		name: "community_memberships_identity_id_fkey",
	}).onDelete("cascade"),
	check("community_memberships_community_not_blank", sql`btrim(${table.communityId}) <> ''`),
	check("community_memberships_status_valid", sql`
		${table.membershipStatus} in ('member', 'not_member', 'unknown')
	`),
	check("community_memberships_member_verified", sql`
		${table.membershipStatus} <> 'member' or ${table.verifiedAt} is not null
	`),
	index("community_memberships_community_status_idx").on(table.communityId, table.membershipStatus),
])

export const memberStatusHistory = pgTable("member_status_history", {
	historyId: bigint("history_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	memberId: uuid("member_id").notNull(),
	fromStatus: text("from_status", {
		enum: memberStatusValues,
	}).$type<MemberStatus>(),
	toStatus: text("to_status", {
		enum: memberStatusValues,
	}).$type<MemberStatus>().notNull(),
	// Immutable actor ID snapshot: deliberately no user FK, so deleting an
	// authentication account cannot erase status-transition attribution.
	changedByUserId: text("changed_by_user_id").notNull(),
	reason: text("reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.memberId],
		foreignColumns: [members.memberId],
		name: "member_status_history_member_id_fkey",
	}).onDelete("restrict"),
	check("member_status_history_from_valid", sql`
		${table.fromStatus} is null
		or ${table.fromStatus} in ('pending', 'active', 'rejected', 'withdrawn')
	`),
	check("member_status_history_to_valid", sql`
		${table.toStatus} in ('pending', 'active', 'rejected', 'withdrawn')
	`),
	check("member_status_history_reason_length", sql`
		${table.reason} is null or char_length(${table.reason}) <= 2000
	`),
	index("member_status_history_member_created_idx").on(table.memberId, table.createdAt.desc()),
	index("member_status_history_to_status_created_idx").on(table.toStatus, table.createdAt.desc()),
	index("member_status_history_changed_by_idx").on(table.changedByUserId),
])

export const eventMessages = pgTable("event_messages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	channelId: text("channel_id").notNull(),
	messageId: text("message_id").notNull().unique(),
	content: text("content").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
})
