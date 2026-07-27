import { relations } from "drizzle-orm/relations"
import {
	account,
	appAccounts,
	communityIdentities,
	communityMemberships,
	grades,
	memberDirectoryProfiles,
	members,
	memberStatusHistory,
	session,
	user,
} from "./schema"

// Relations never cross between app_auth and the domain. The authentication
// tables relate only to each other, and the domain reaches an authentication
// subject through app_accounts, which stores the identifier as a plain value.
// See supabase/migrations/20260727000000_split_auth_schema.sql.

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}))

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}))

export const appAccountsRelations = relations(appAccounts, ({ one }) => ({
	member: one(members, {
		fields: [appAccounts.memberId],
		references: [members.memberId],
	}),
}))

export const gradesRelations = relations(grades, ({ many }) => ({
	members: many(members),
}))

export const membersRelations = relations(members, ({ many, one }) => ({
	grade: one(grades, {
		fields: [members.grade],
		references: [grades.id],
	}),
	account: one(appAccounts),
	directoryProfile: one(memberDirectoryProfiles),
	statusHistory: many(memberStatusHistory),
}))

export const memberDirectoryProfilesRelations = relations(memberDirectoryProfiles, ({ one }) => ({
	member: one(members, {
		fields: [memberDirectoryProfiles.memberId],
		references: [members.memberId],
	}),
}))

export const communityIdentitiesRelations = relations(communityIdentities, ({ many }) => ({
	memberships: many(communityMemberships),
}))

export const communityMembershipsRelations = relations(communityMemberships, ({ one }) => ({
	identity: one(communityIdentities, {
		fields: [communityMemberships.identityId],
		references: [communityIdentities.identityId],
	}),
}))

export const memberStatusHistoryRelations = relations(memberStatusHistory, ({ one }) => ({
	member: one(members, {
		fields: [memberStatusHistory.memberId],
		references: [members.memberId],
	}),
}))
