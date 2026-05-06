import { drizzle } from "drizzle-orm/libsql";
import { admins } from "./schema/users";
import * as argon2 from "argon2";
export const db = drizzle(process.env.DB_FILE_NAME!, { casing: "snake_case" });

// verify superuser exists
await db
	.insert(admins)
	.values({
		id: process.env.SUPERUSER_NAME ?? "su",
		name: process.env.SUPERUSER_NAME ?? "su",
		passwordHash: await argon2.hash(process.env.SUPERUSER_PASSWORD ?? "meow"),
	})
	.onConflictDoNothing({ target: admins.id });
