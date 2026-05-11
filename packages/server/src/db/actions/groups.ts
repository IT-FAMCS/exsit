import { CreateGroupRequest, CreateGroupResponse } from "@exsit/shared/types/admin";
import { z } from "zod";
import { ulid } from "ulid";
import { db } from "../connection";
import { groups, students } from "../schema/users";
import { eq } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";

export const groupExists = async (code: string) => !!(await getGroupById(code));
export const getGroupByPublicCode = async (code: string) =>
	(await db.select().from(groups).where(eq(groups.publicCode, code)))?.at(0);
export const getGroupById = async (id: string) =>
	(await db.select().from(groups).where(eq(groups.id, id)))?.at(0);
export const getGroupByStudentId = async (user: string) =>
	(
		await db.select({ group: students.group }).from(students).where(eq(students.id, user)).limit(1)
	)?.at(0)?.group;

export const createGroup = async (
	req: z.infer<typeof CreateGroupRequest>,
): Promise<z.input<typeof CreateGroupResponse>> => {
	if (await getGroupByPublicCode(req.code)) return { error: "taken" };
	if (req.course < 1 || req.course > 4) return { error: "invalidCourse" };

	const id = `G-${ulid()}`;
	await db.insert(groups).values({
		id,
		publicCode: req.code,
		course: req.course,
		num: req.num,
		department: req.department,
	});
	return ok(id);
};
