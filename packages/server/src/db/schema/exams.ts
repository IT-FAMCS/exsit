import * as s from "drizzle-orm/sqlite-core";
import {
	CAMPAIGN_STATUSES,
	MATERIALS_TAGS,
	MATERIALS_TYPES,
	SupposedOrderType,
	VoteType,
	VotingCampaignOptionsType,
	VotingCampaignResultsType,
	VotingCampaignStateType,
} from "@exsit/shared/types/exams";
import { groups, students } from "./users";

export const exams = s.sqliteTable("exams", {
	id: s.text().primaryKey(),
	group: s
		.text()
		.references(() => groups.id, { onDelete: "cascade" })
		.notNull(),
	subject: s.text().notNull(),
	date: s.integer({ mode: "timestamp_ms" }),
	class: s.text(),
	teacher: s.text().notNull(),
	supposedOrder: s.text({ mode: "json" }).$type<SupposedOrderType>().default({ type: "unknown" }),
});

export const preparationMaterials = s.sqliteTable("preparation_materials", {
	exam: s
		.text()
		.notNull()
		.references(() => exams.id, { onDelete: "cascade" }),
	title: s.text(),
	value: s.text().notNull(),
	tag: s.text().$type<(typeof MATERIALS_TAGS)[number]>(),
	type: s.text().$type<(typeof MATERIALS_TYPES)[number]>().notNull(),
});

export const votingCampaigns = s.sqliteTable("voting_campaigns", {
	id: s.text().primaryKey(),
	exam: s
		.text()
		.references(() => exams.id, { onDelete: "cascade" })
		.notNull(),
	status: s.text().$type<(typeof CAMPAIGN_STATUSES)[number]>().notNull(),
	options: s.text({ mode: "json" }).$type<VotingCampaignOptionsType>().notNull(),
	state: s.text({ mode: "json" }).$type<VotingCampaignStateType>().notNull(),
	started: s.integer({ mode: "timestamp_ms" }),
	stopped: s.integer({ mode: "timestamp_ms" }),
	result: s.text({ mode: "json" }).$type<VotingCampaignResultsType>(),
});

export const votes = s.sqliteTable(
	"votes",
	{
		student: s
			.text()
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		campaign: s
			.text()
			.notNull()
			.references(() => votingCampaigns.id, { onDelete: "cascade" }),
		vote: s.text({ mode: "json" }).$type<VoteType>().notNull(),
	},
	(t) => [s.primaryKey({ columns: [t.student, t.campaign] })],
);

export const votingTransactions = s.sqliteTable("voting_transactions", {
	id: s.text().primaryKey(),
	student: s
		.text()
		.notNull()
		.references(() => students.id, { onDelete: "cascade" }),
	campaign: s
		.text()
		.notNull()
		.references(() => votingCampaigns.id, { onDelete: "cascade" }),
});
