import { db } from "../connection";
import { z } from "zod";
import { LoginResponse, LoginRequest, VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import { groupCodes, students } from "../schema/users";
import { and, eq, isNull } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import * as argon2 from "argon2";

export const getGroupInformation = async (code: string) => {
	const [groupInfo] = await db.select().from(groupCodes).where(eq(groupCodes.code, code));
	return groupInfo;
};

export const tryLoginStudent = async (
	req: z.infer<typeof LoginRequest>,
): Promise<z.input<typeof LoginResponse>> => {
	const studentsInGroup = await getStudentsByGroupCode(req.groupCode);
	if (studentsInGroup.error || !(req.studentId in studentsInGroup.data.students))
		return { error: "invalidGroupCode" };
	const student = await getStudentById(req.studentId);
	try {
		if (!student || !(await argon2.verify(student.passwordHash, req.password)))
			return { error: "invalidCredentials" };
	} catch (ex) {
		return { error: "internal", details: `${ex}` };
	}
	return ok(null);
};

export type DatabaseStudent = (typeof students)["$inferSelect"];
export const getStudentById = async (id: string): Promise<DatabaseStudent | undefined> =>
	(await db.select().from(students).where(eq(students.id, id)).limit(1))?.[0];

export const getStudentsByGroupCode = async (
	code: string,
): Promise<z.input<typeof VerifyGroupCodeResponse>> => {
	const groupInfo = await getGroupInformation(code);
	if (!groupInfo) return { error: "invalidGroupCode" };

	const matchingStudents = await db
		.select({ id: students.id, fullName: students.fullName })
		.from(students)
		.where(
			and(
				eq(students.group, groupInfo.group),
				and(
					eq(students.course, groupInfo.course),
					groupInfo.department === null
						? isNull(students.department)
						: eq(students.department, groupInfo.department),
				),
			),
		);
	return ok({ students: Object.fromEntries(matchingStudents.map((ms) => [ms.id, ms.fullName])) });
};
