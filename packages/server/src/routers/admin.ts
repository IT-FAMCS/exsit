import { zValidator } from "@/utils/hono";
import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import { AddStudentsToGroupRequest, CreateGroupRequest } from "@exsit/shared/types/admin";
import { createGroup } from "@/db/actions/groups";
import { addStudentsToGroup } from "@/db/actions/users";

export const admin = new Hono<{ Variables: JwtVariables }>()
	.use("*", async (c, next) => {
		const payload = c.get("jwtPayload");
		if (payload && typeof payload === "object" && "id" in payload && payload.id === "admin") {
			await next();
			return;
		}
		return c.body(null, 401);
	})
	.post("/group/:code/create", zValidator("json", CreateGroupRequest), async (c) =>
		c.json(await createGroup(c.req.param("code"), c.req.valid("json"))),
	)
	.patch("/group/:code/add-students", zValidator("json", AddStudentsToGroupRequest), async (c) =>
		c.json(await addStudentsToGroup(c.req.param("code"), c.req.valid("json"))),
	);
