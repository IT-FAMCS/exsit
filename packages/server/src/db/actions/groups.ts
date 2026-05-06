import { CreateGroupRequest, CreateGroupResponse } from "@exsit/shared/types/admin";
import { z } from "zod";
import { db } from "../connection";
import { groups } from "../schema/users";
import { eq } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";

export const groupExists = async (code: string) => !!(await getGroupById(code));
export const getGroupById = async (code: string) => {
	const [group] = await db.select().from(groups).where(eq(groups.code, code)).limit(1);
	return group;
};

export const createGroup = async (
	code: string,
	req: z.infer<typeof CreateGroupRequest>,
): Promise<z.input<typeof CreateGroupResponse>> => {
	if (await groupExists(code)) return { error: "taken" };
	if (req.course < 1 || req.course > 4) return { error: "invalidCourse" };
	await db
		.insert(groups)
		.values({ code, course: req.course, num: req.num, department: req.department });
	return ok(null);
};
