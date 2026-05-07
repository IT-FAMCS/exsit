import * as s from "drizzle-orm/sqlite-core";
import { CAMPAIGN_STATES, MATERIALS_TAGS, SUPPORTED_CAMPAIGN_TYPES, SupposedOrderType, VoteType } from "@exsit/shared/types/exams";
import { files } from "./files";
import { groups } from "./users";

export const exams = s.sqliteTable("exams", {
	id: s.text().primaryKey(),
	group: s
		.text()
		.references(() => groups.code)
		.notNull(),
	subject: s.text().notNull(),
	date: s.integer({ mode: "timestamp_ms" }),
	class: s.text(),
	teacher: s.text().notNull(),
	supposedOrder: s
		.text({ mode: "json" })
		.$type<SupposedOrderType>()
		.default({ type: "unknown" }),
});

export const preparationMaterials = s.sqliteTable("preparation_materials", {
	exam: s.text(),
	file: s
		.text()
		.references(() => files.id)
		.notNull(),
	tag: s.text().$type<keyof typeof MATERIALS_TAGS>(),
});

export const votingCampaigns = s.sqliteTable("voting_campaigns", {
	id: s.text().primaryKey(),
	exam: s
		.text()
		.references(() => exams.id)
		.notNull(),
	type: s.text().$type<keyof typeof SUPPORTED_CAMPAIGN_TYPES>().notNull(),
    state: s.text().$type<keyof typeof CAMPAIGN_STATES>().notNull()
});

export const votes = s.sqliteTable(
	"votes",
	{
		user: s.text(),
		campaign: s.text(),
        vote: s.text({mode: "json"}).$type<VoteType>().notNull()
	},
	(t) => [s.primaryKey({ columns: [t.user, t.campaign] })],
);