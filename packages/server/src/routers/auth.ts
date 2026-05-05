import { z } from "zod";
import { LoginRequest } from "@exsit/shared/types/auth";
import { getStudentsByGroupCode, tryLoginStudent } from "@/db/actions/users";
import { Hono } from "hono";
import { sign, type JwtVariables } from "hono/jwt";
import { zValidator } from "@/utils/hono";
import { setCookie } from "hono/cookie";

export const auth = new Hono<{ Variables: JwtVariables }>()
	.get(
		"/verify-group-code",
		zValidator(
			"query",
			z.object({
				code: z.string(),
			}),
		),
		async (c) => c.json(await getStudentsByGroupCode(c.req.valid("query").code)),
	)
	.post("/login", zValidator("json", LoginRequest), async (c) => {
		const request = c.req.valid("json");
		const result = await tryLoginStudent(request);
		if (!result.error) {
			const token = await sign(
				{ id: request.id },
				process.env.JWT_SECRET ?? "someone forgot to set process.env.JWT_SECRET",
				"HS256",
			);
			setCookie(c, "auth", token, {
				httpOnly: true,
				maxAge: 7 * 86400,
				domain: process.env.HOSTNAME,
				sameSite: "lax",
				secure: true,
			});
		}
		return c.json(result);
	});
