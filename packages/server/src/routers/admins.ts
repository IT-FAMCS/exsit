import { zValidator } from "@/utils/hono";
import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { CreateAdminRequest } from "@exsit/shared/types/admin";
import { createAdmin } from "@/db/actions/users";
import { requireAdminPermissions } from "./auth";

export const adminRouter = new Hono<{ Variables: JwtVariables }>().post(
	"/create",
	requireAdminPermissions,
	zValidator("json", CreateAdminRequest),
	async (c) => c.json(await createAdmin(c.req.valid("json"))),
);
