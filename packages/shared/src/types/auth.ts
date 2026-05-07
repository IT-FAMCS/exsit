import { z } from "zod";
import { createApiSchema } from "./api";

export const [, VerifyGroupCodeResponse] = createApiSchema({
	response: z.object({
		users: z.record(z.string(), z.string()),
	}),
	errors: z.enum(["invalidGroupCode"]),
});

export const [LoginRequest, LoginResponse] = createApiSchema({
	request: z.object({
		groupCode: z.string(),
		id: z.string(),
		password: z.string(),
	}),
	response: z.enum(["student", "admin"]),
	errors: z.enum(["invalidCredentials", "invalidGroupCode"]),
});

export const Group = z.object({
	code: z.string(),
	course: z.number(),
	num: z.number(),
	department: z.string().nullable(),
});

export const Student = z.object({
	id: z.string(),
	fullName: z.string(),
	informalFirstName: z.string(),
	group: Group,
});

export const Admin = z.object({
	id: z.string(),
	name: z.string(),
});

export type GroupType = z.infer<typeof Group>;
export type StudentType = z.infer<typeof Student>;
export type AdminType = z.infer<typeof Admin>;

export const [, MeResponse] = createApiSchema({
	response: z.discriminatedUnion("role", [
		z
			.object({
				role: z.literal("student"),
			})
			.extend(Student.shape),
		z.object({ role: z.literal("admin") }).extend(Admin.shape),
	]),
	errors: z.enum(["invalidID", "invalidGroupCode"]),
});

export type AuthInformation = Extract<z.infer<typeof MeResponse>, { error: null }>["data"];
