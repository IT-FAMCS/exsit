import { db } from "../connection";
import { z } from "zod";
import { VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import { groupCodes, students } from "../schema/users";
import { and, eq, isNull } from "drizzle-orm";

export const getGroupByCode = async (
	code: string,
): Promise<z.input<typeof VerifyGroupCodeResponse>> => {
	const [groupInfo] = await db.select().from(groupCodes).where(eq(groupCodes.code, code));
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
	return {
		data: { students: Object.fromEntries(matchingStudents.map((ms) => [ms.id, ms.fullName])) },
	};
};
