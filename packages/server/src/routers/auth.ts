import jwt from "@elysia/jwt";
import Elysia from "elysia";
import { z } from "zod";
import { VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import { getGroupByCode } from "@/db/actions/users";

export const auth = new Elysia()
	.use(
		jwt({
			name: "jwt",
			secret: process.env.JWT_SECRET ?? "someone forgot to specify process.env.JWT_SECRET",
		}),
	)
	.get("/verify-group-code", ({ query }) => getGroupByCode(query.code), {
		body: VerifyGroupCodeResponse,
		query: z.object({ code: z.string() }),
	});
