import { sql } from "drizzle-orm";
import * as s from "drizzle-orm/sqlite-core";

export const groupCodes = s.sqliteTable("group_codes", {
	code: s.text().primaryKey(),
	course: s.numeric().notNull(),
	group: s.numeric().notNull(),
	department: s.text(),
});

export const students = s.sqliteTable(
	"students",
	{
		id: s.text().primaryKey(),
		fullName: s.text().notNull(),
		informalFirstName: s.text().notNull(),
		course: s.numeric().notNull(),
		group: s.numeric().notNull(),
		department: s.text(),
		passwordHash: s.text().notNull(),
	},
	(table) => [s.check("course", sql`${table.course} between 1 and 4`)],
);
