import { CreateGroupRequest, CreateGroupResponse } from "@exsit/shared/types/admin";
import { z } from "zod";
import { ulid } from "ulid";
import { db } from "../connection";
import { groups, students } from "../schema/users";
import { eq } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import { exams } from "../schema/exams";

export const groupExists = async (code: string) => !!(await getGroupById(code));
export const getGroupByPublicCode = async (code: string) =>
	(await db.select().from(groups).where(eq(groups.publicCode, code)))?.at(0);
export const getGroupById = async (id: string) =>
	(await db.select().from(groups).where(eq(groups.id, id)))?.at(0);
export const getGroupIdByStudent = async (student: string) =>
	(
		await db
			.select({ group: students.group })
			.from(students)
			.where(eq(students.id, student))
			.limit(1)
	)?.at(0)?.group;
export const getGroupIdByExam = async (exam: string) =>
	(await db.select({ group: exams.group }).from(exams).where(eq(exams.id, exam)).limit(1))?.at(0)
		?.group;

export const getGroupStudents = async (group: string) =>
	(await groupExists(group))
		? await db.select().from(students).where(eq(students.group, group))
		: undefined;
export const getGroupSize = async (group: string) =>
	(await getGroupStudents(group))?.length ?? undefined;

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
