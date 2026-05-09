import { z } from "zod";
import { ChangePasswordRequest, LoginRequest } from "@exsit/shared/types/auth";
import {
	changeUserPassword,
	getAuthInfo,
	getUsersByGroupCode,
	tryLoginUser,
} from "@/db/actions/users";
import { Hono } from "hono";
import { sign, type JwtVariables } from "hono/jwt";
import { zValidator } from "@/utils/hono";
import { setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

export const requireAdminPermissions = createMiddleware<{ Variables: JwtVariables }>(
	async (c, next) => {
		const payload = c.get("jwtPayload");
		if (payload && typeof payload === "object" && "role" in payload && payload.role === "admin") {
			await next();
			return;
		}
		return c.body(null, 401);
	},
);

export const authRouter = new Hono<{ Variables: JwtVariables }>()
	.get(
		"/verify-group-code",
		zValidator(
			"query",
			z.object({
				code: z.string(),
			}),
		),
		async (c) => c.json(await getUsersByGroupCode(c.req.valid("query").code)),
	)
	.post("/login", zValidator("json", LoginRequest), async (c) => {
		const request = c.req.valid("json");
		const result = await tryLoginUser(request);
		if (!result.error) {
			const token = await sign(
				{ id: request.id, role: result.data },
				process.env.JWT_SECRET ?? "someone forgot to set process.env.JWT_SECRET",
				"HS256",
			);
			setCookie(c, "exsitauth", token, {
				httpOnly: true,
				maxAge: 7 * 86400,
				domain: process.env.HOSTNAME,
				sameSite: "lax",
				secure: true,
			});
		}
		return c.json(result);
	})
	.get("/me", async (c) => {
		const payload = c.get("jwtPayload") as { id: string; role: "student" | "admin" };
		return c.json(await getAuthInfo(payload));
	})
	.patch("/me/change-password", zValidator("query", ChangePasswordRequest), async (c) => {
		const payload = c.get("jwtPayload") as { id: string; role: "student" | "admin" };
		return c.json(await changeUserPassword(payload, c.req.valid("query")));
	});
