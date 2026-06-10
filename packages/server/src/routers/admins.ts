import { zValidator } from "@/utils/hono";
import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { CreateAdminRequest } from "@exsit/shared/types/admin";
import { createAdmin, resetStudentPassword } from "@/db/actions/users";
import { requireAdminPermissions } from "./auth";
import { AdminResetPasswordRequest } from "@exsit/shared/types/auth";

export const adminRouter = new Hono<{ Variables: JwtVariables }>()
	.post("/create", requireAdminPermissions, zValidator("json", CreateAdminRequest), async (c) =>
		c.json(await createAdmin(c.req.valid("json"))),
	)
	.post(
		"/reset-student-password",
		requireAdminPermissions,
		zValidator("query", AdminResetPasswordRequest),
		async (c) => c.json(await resetStudentPassword(c.req.valid("query"))),
	);
