import "dotenv/config";
import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { drizzle } from "drizzle-orm/libsql";

const db = drizzle(process.env.DB_FILE_NAME!);
const app = new Elysia({ adapter: node() })
	.get("/", () => "Hello Elysia")
	.listen(3000, ({ hostname, port }) => {
		console.log(`server running at ${hostname}:${port}`);
	});
