import { db } from "../connection";
import { z } from "zod";
import { LoginResponse, LoginRequest, VerifyGroupCodeResponse } from "@exsit/shared/types/auth";
import { students } from "../schema/users";
import { eq } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import * as argon2 from "argon2";
import { groupExists } from "./groups";
import { AddStudentsToGroupRequest, AddStudentsToGroupResponse } from "@exsit/shared/types/admin";
import { v7 } from "uuid";

export const tryLoginStudent = async (
	req: z.infer<typeof LoginRequest>,
): Promise<z.input<typeof LoginResponse>> => {
	if (req.id === "admin")
		return req.password === (process.env.ADMIN_PASSWORD ?? "")
			? ok(null)
			: { error: "invalidCredentials" };

	if (!req.groupCode) return { error: "invalidGroupCode" };
	const studentsInGroup = await getStudentsByGroupCode(req.groupCode);
	if (studentsInGroup.error || !(req.id in studentsInGroup.data.students))
		return { error: "invalidGroupCode" };

	const student = await getStudentById(req.id);
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
	if (!(await groupExists(code))) return { error: "invalidGroupCode" };

	const matchingStudents = await db
		.select({ id: students.id, fullName: students.fullName })
		.from(students)
		.where(eq(students.group, code));
	return ok({ students: Object.fromEntries(matchingStudents.map((ms) => [ms.id, ms.fullName])) });
};

export const addStudentsToGroup = async (
	code: string,
	req: z.infer<typeof AddStudentsToGroupRequest>,
): Promise<z.input<typeof AddStudentsToGroupResponse>> => {
	if (!(await groupExists(code))) return { error: "invalidGroupCode" };
	const dbStudents = await Promise.all(
		req.students.map(
			async (s) =>
				({
					fullName: s.fullName,
					informalFirstName: s.informalFirstName,
					group: code,
					id: v7(),
					passwordHash: await argon2.hash(s.password),
				}) satisfies typeof students.$inferInsert,
		),
	);
	await db.insert(students).values(dbStudents);
	return ok(null);
};
