import { sql } from "drizzle-orm";
import * as s from "drizzle-orm/sqlite-core";

export const groups = s.sqliteTable(
	"groups",
	{
		code: s.text().primaryKey(),
		course: s.integer().notNull(),
		num: s.integer().notNull(),
		department: s.text(),
	},
	(table) => [s.check("course", sql`${table.course} between 1 and 4`)],
);

export const students = s.sqliteTable("students", {
	id: s.text().primaryKey(),
	fullName: s.text().notNull(),
	informalFirstName: s.text().notNull(),
	group: s
		.text()
		.notNull()
		.references(() => groups.code),
	passwordHash: s.text().notNull(),
});
