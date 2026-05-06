import { db } from "../connection";
import { z } from "zod";
import {
	LoginResponse,
	LoginRequest,
	VerifyGroupCodeResponse,
	MeResponse,
} from "@exsit/shared/types/auth";
import { admins, students } from "../schema/users";
import { eq } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import * as argon2 from "argon2";
import { getGroupById, groupExists } from "./groups";
import {
	AddStudentsToGroupRequest,
	AddStudentsToGroupResponse,
	CreateAdminRequest,
	CreateAdminResponse,
} from "@exsit/shared/types/admin";
import { v7 } from "uuid";

export const tryLoginUser = async (
	req: z.infer<typeof LoginRequest>,
): Promise<z.input<typeof LoginResponse>> => {
	if (req.groupCode === (process.env.ADMINS_GROUP_CODE ?? "secret")) {
		const admin = await getAdminById(req.id);
		try {
			if (!admin || !(await argon2.verify(admin.passwordHash, req.password)))
				return { error: "invalidCredentials" };
		} catch (ex) {
			return { error: "internal", details: `${ex}` };
		}
		return ok("admin");
	}

	const studentsInGroup = await getUsersByGroupCode(req.groupCode);
	if (studentsInGroup.error || !(req.id in studentsInGroup.data.users))
		return { error: "invalidGroupCode" };

	const student = await getStudentById(req.id);
	try {
		if (!student || !(await argon2.verify(student.passwordHash, req.password)))
			return { error: "invalidCredentials" };
	} catch (ex) {
		return { error: "internal", details: `${ex}` };
	}
	return ok("student");
};

export type DatabaseStudent = (typeof students)["$inferSelect"];
export const getStudentById = async (id: string): Promise<DatabaseStudent | undefined> =>
	(await db.select().from(students).where(eq(students.id, id)).limit(1))?.[0];

export type DatabaseAdmin = (typeof admins)["$inferSelect"];
export const getAdminById = async (id: string): Promise<DatabaseAdmin | undefined> =>
	(await db.select().from(admins).where(eq(admins.id, id)).limit(1))?.[0];

export const createAdmin = async (
	req: z.infer<typeof CreateAdminRequest>,
): Promise<z.input<typeof CreateAdminResponse>> => {
	const taken = !!(await getAdminById(req.id));
	if (taken) return { error: "taken" };
	await db.insert(admins).values({
		id: req.id,
		name: req.name ?? req.id,
		passwordHash: await argon2.hash(req.password),
	});
	return ok(null);
};

export const getUsersByGroupCode = async (
	code: string,
): Promise<z.input<typeof VerifyGroupCodeResponse>> => {
	if (code === (process.env.ADMINS_GROUP_CODE ?? "secret")) {
		const allAdmins = await db.select({ id: admins.id, name: admins.name }).from(admins);
		return ok({ users: Object.fromEntries(allAdmins.map((aa) => [aa.id, aa.name])) });
	}
	if (!(await groupExists(code))) return { error: "invalidGroupCode" };

	const matchingStudents = await db
		.select({ id: students.id, fullName: students.fullName })
		.from(students)
		.where(eq(students.group, code));
	return ok({ users: Object.fromEntries(matchingStudents.map((ms) => [ms.id, ms.fullName])) });
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

export const getAuthInfo = async (payload: {
	role: "student" | "admin";
	id: string;
}): Promise<z.infer<typeof MeResponse>> => {
	switch (payload.role) {
		case "admin": {
			const admin = await getAdminById(payload.id);
			if (!admin) return { error: "invalidID" };
			return ok({
				role: "admin",
				id: admin.id,
				name: admin.name,
			});
		}
		case "student": {
			const student = await getStudentById(payload.id);
			if (!student) return { error: "invalidID" };
			const group = await getGroupById(student.group);
			if (!group) return { error: "invalidGroupCode" };
			return ok({
				role: "student",
				id: student.id,
				fullName: student.fullName,
				informalFirstName: student.informalFirstName,
				group: {
					code: group.code,
					course: Number(group.course),
					num: Number(group.num),
					department: group.department,
				},
			});
		}
	}
};
