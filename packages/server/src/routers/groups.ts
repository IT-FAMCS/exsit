import { createGroup, groupExists } from "@/db/actions/groups";
import { addStudentsToGroup } from "@/db/actions/users";
import { requireExisting, zValidator } from "@/utils/hono";
import {
	CreateGroupRequest,
	AddStudentsToGroupRequest,
	NotifyGroupRequest,
} from "@exsit/shared/types/admin";
import { Hono } from "hono";
import { requireAdminPermissions } from "./auth";
import { JwtVariables } from "hono/jwt";
import { CreateExamRequest } from "@exsit/shared/types/exams";
import { createExam, getExams } from "@/db/actions/exams";
import { except } from "hono/combine";
import { sendGroupMessage } from "@/bot";

const requireExistingGroup = requireExisting("group", "invalidGroupCode", groupExists);

export const groupRouter = new Hono<{ Variables: JwtVariables }>()
	.use("*", except("/groups/:group/exams", requireAdminPermissions))

	.post("/create", zValidator("json", CreateGroupRequest), async (c) =>
		c.json(await createGroup(c.req.valid("json"))),
	)

	.use("/:group/*", requireExistingGroup)
	.patch("/:group/add-students", zValidator("json", AddStudentsToGroupRequest), async (c) =>
		c.json(await addStudentsToGroup(c.req.param("group"), c.req.valid("json"))),
	)
	.post("/:group/create-exam", zValidator("json", CreateExamRequest), async (c) =>
		c.json(await createExam(c.req.param("group"), c.req.valid("json"))),
	)
	.get("/:group/exams", async (c) => c.json(await getExams(c.req.param("group"))))
	.post("/:group/notify", zValidator("json", NotifyGroupRequest), async (c) =>
		c.json(await sendGroupMessage(c.req.param("group"), c.req.valid("json"))),
	);
