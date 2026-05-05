import { zValidator } from "@/utils/hono";
import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { z } from "zod";

export const admin = new Hono<{ Variables: JwtVariables }>()
	.use("*", async (c, next) => {
		const payload = c.get("jwtPayload");
		if (payload && typeof payload === "object" && "id" in payload && payload.id === "admin") {
			await next();
			return;
		}
		return c.body(null, 401);
	})
	.post(
		"/create-group",
		zValidator(
			"json",
			z.object({
				code: z.string(),
				course: z.number(),
				group: z.number(),
				department: z.string().nullable(),
			}),
		),
		async (c) => {
            return c.text("yay")
        },
	);
