import { relations } from "drizzle-orm/relations";
import { grades, members } from "./schema";

export const membersRelations = relations(members, ({one}) => ({
	grade: one(grades, {
		fields: [members.grade],
		references: [grades.id]
	}),
}));

export const gradesRelations = relations(grades, ({many}) => ({
	members: many(members),
}));