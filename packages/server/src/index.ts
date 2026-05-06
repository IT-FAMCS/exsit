import "dotenv/config";
import { auth } from "./routers/auth";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { except } from "hono/combine";
import { jwt } from "hono/jwt";
import { admin } from "./routers/admin";

const app = new Hono()
	.use(logger())
	.use("*", async (c, next) => {
		await next();
		if (c.res.headers.get("content-type")?.includes("application/json")) {
			const cloned = c.res.clone();
			const body = await cloned.json();
			if (body && typeof body === "object" && "error" in body && body.error !== null) {
				c.res = new Response(c.res.body, {
					status: ["unknown", "internal"].includes(body.error) ? 500 : 400,
					headers: c.res.headers,
				});
			}
		}
	})
	.use(
		"*",
		cors({
			origin: process.env.FRONTEND_HOSTNAME ?? "*",
			credentials: true,
		}),
	)
	.use(
		"*",
		except(
			["/", "/login", "/verify-group-code"],
			jwt({
				alg: "HS256",
				secret: process.env.JWT_SECRET ?? "someone forgot to set process.env.JWT_SECRET",
				cookie: "exsitauth",
			}),
		),
	);

app.get("/", (c) => c.text("meow!"));
app.route("/", auth);
app.route("/admin", admin);

serve(app, (info) => {
	console.log(`server running at ${info.address}:${info.port}`);
});
