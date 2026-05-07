import * as s from "drizzle-orm/sqlite-core";

export const files = s.sqliteTable("files", {
    id: s.text().primaryKey(),
    type: s.text().notNull(),
    uploaded: s.integer({mode: "timestamp_ms"}).notNull(),
    modified: s.integer({mode: "timestamp_ms"}),
    size: s.integer().notNull(),
    data: s.blob().notNull()
});