import jwt from "@elysia/jwt";
import Elysia from "elysia";
import { z } from "zod";
import { LoginRequest, LoginResponse, VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import { getStudentsByGroupCode, tryLoginStudent } from "@/db/actions/users";

export const auth = new Elysia()
	.use(
		jwt({
			name: "jwt",
			secret: process.env.JWT_SECRET ?? "someone forgot to specify process.env.JWT_SECRET",
		}),
	)
	.get("/verify-group-code", ({ query }) => getStudentsByGroupCode(query.code), {
		response: VerifyGroupCodeResponse,
		query: z.object({ code: z.string() }),
	})
	.post(
		"/login",
		async ({ jwt, body, cookie: { auth } }) => {
			const result = await tryLoginStudent(body);
			if (!result.error) {
				const value = await jwt.sign({ id: body.studentId });
				auth.set({
					value,
					httpOnly: true,
					maxAge: 7 * 86400,
					domain: process.env.HOSTNAME,
					sameSite: "lax",
					secure: true,
				});
			}
			return result;
		},
		{ body: LoginRequest, response: LoginResponse },
	);
