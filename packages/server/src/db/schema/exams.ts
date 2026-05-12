import * as s from "drizzle-orm/sqlite-core";
import {
	CAMPAIGN_STATES,
	MATERIALS_TAGS,
	MATERIALS_TYPES,
	SupposedOrderType,
	VoteType,
	VotingCampaignOptionsType,
} from "@exsit/shared/types/exams";
import { groups, students } from "./users";

export const exams = s.sqliteTable("exams", {
	id: s.text().primaryKey(),
	group: s
		.text()
		.references(() => groups.id)
		.notNull(),
	subject: s.text().notNull(),
	date: s.integer({ mode: "timestamp_ms" }),
	class: s.text(),
	teacher: s.text().notNull(),
	supposedOrder: s.text({ mode: "json" }).$type<SupposedOrderType>().default({ type: "unknown" }),
});

export const preparationMaterials = s.sqliteTable("preparation_materials", {
	exam: s.text(),
	value: s.text().notNull(),
	tag: s.text().$type<(typeof MATERIALS_TAGS)[number]>(),
	type: s.text().$type<(typeof MATERIALS_TYPES)[number]>().notNull(),
});

export const votingCampaigns = s.sqliteTable("voting_campaigns", {
	id: s.text().primaryKey(),
	exam: s
		.text()
		.references(() => exams.id)
		.notNull(),
	state: s.text().$type<(typeof CAMPAIGN_STATES)[number]>().notNull(),
	options: s.text({ mode: "json" }).$type<VotingCampaignOptionsType>().notNull(),
});

export const votes = s.sqliteTable(
	"votes",
	{
		user: s.text(),
		campaign: s.text(),
		vote: s.text({ mode: "json" }).$type<VoteType>().notNull(),
	},
	(t) => [s.primaryKey({ columns: [t.user, t.campaign] })],
);

export const votingTransactions = s.sqliteTable("voting_transactions", {
	id: s.text().primaryKey(),
	student: s
		.text()
		.notNull()
		.references(() => students.id),
	votingCampaign: s
		.text()
		.notNull()
		.references(() => votingCampaigns.id),
});
