import { relations } from "drizzle-orm/relations"
import {
	account,
	communityIdentities,
	communityMemberships,
	grades,
	memberDirectoryProfiles,
	members,
	memberStatusHistory,
	session,
	user,
} from "./schema"

export const userRelations = relations(user, ({ many, one }) => ({
	member: one(members, {
		fields: [user.memberId],
		references: [members.memberId],
		relationName: "userMember",
	}),
	sessions: many(session),
	accounts: many(account),
	reviewedMembers: many(members, { relationName: "memberReviewer" }),
	communityIdentities: many(communityIdentities),
	memberStatusChanges: many(memberStatusHistory, { relationName: "memberStatusChangedBy" }),
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
	communityIdentity: one(communityIdentities),
}))

export const gradesRelations = relations(grades, ({ many }) => ({
	members: many(members),
}))

export const membersRelations = relations(members, ({ many, one }) => ({
	grade: one(grades, {
		fields: [members.grade],
		references: [grades.id],
	}),
	reviewedBy: one(user, {
		fields: [members.reviewedByUserId],
		references: [user.id],
		relationName: "memberReviewer",
	}),
	directoryProfile: one(memberDirectoryProfiles),
	statusHistory: many(memberStatusHistory),
}))

export const memberDirectoryProfilesRelations = relations(memberDirectoryProfiles, ({ one }) => ({
	member: one(members, {
		fields: [memberDirectoryProfiles.memberId],
		references: [members.memberId],
	}),
}))

export const communityIdentitiesRelations = relations(communityIdentities, ({ many, one }) => ({
	user: one(user, {
		fields: [communityIdentities.userId],
		references: [user.id],
	}),
	authAccount: one(account, {
		fields: [communityIdentities.authAccountId],
		references: [account.id],
	}),
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
	changedBy: one(user, {
		fields: [memberStatusHistory.changedByUserId],
		references: [user.id],
		relationName: "memberStatusChangedBy",
	}),
}))
