import "dotenv/config";
import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { auth } from "./routers/auth";
import cors from "@elysia/cors";

new Elysia({ adapter: node() })
	.mapResponse(({ responseValue, set }) => {
		if (responseValue && typeof responseValue === "object" && "error" in responseValue)
			set.status =
				responseValue.error === "unknown" || responseValue.error === "internal" ? 500 : 400;
	})
	.use(cors({ origin: process.env.FRONTEND_HOSTNAME ? process.env.FRONTEND_HOSTNAME : true }))
	.use(auth)
	.listen(process.env.PORT, ({ hostname, port }) => {
		console.log(`server running at ${hostname}:${port}`);
	});
