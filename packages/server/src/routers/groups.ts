import { createGroup, groupExists } from "@/db/actions/groups";
import { addStudentsToGroup } from "@/db/actions/users";
import { requireExisting, zValidator } from "@/utils/hono";
import { CreateGroupRequest, AddStudentsToGroupRequest } from "@exsit/shared/types/admin";
import { Hono } from "hono";
import { requireAdminPermissions } from "./auth";
import { JwtVariables } from "hono/jwt";
import { CreateExamRequest } from "@exsit/shared/types/exams";
import { createExam } from "@/db/actions/exams";
import { except } from "hono/combine";

const requireExistingGroup = requireExisting("code", "invalidGroupCode", groupExists);

export const groupRouter = new Hono<{ Variables: JwtVariables }>()
	.use("*", requireAdminPermissions)
	.use("/:code/*", except("/groups/:code/create", requireExistingGroup))

	.post("/:code/create", zValidator("json", CreateGroupRequest), async (c) =>
		c.json(await createGroup(c.req.param("code"), c.req.valid("json"))),
	)
	.patch("/:code/add-students", zValidator("json", AddStudentsToGroupRequest), async (c) =>
		c.json(await addStudentsToGroup(c.req.param("code"), c.req.valid("json"))),
	)
	.post("/:code/create-exam", zValidator("json", CreateExamRequest), async (c) =>
		c.json(await createExam(c.req.param("code"), c.req.valid("json"))),
	);
