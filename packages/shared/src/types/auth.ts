import { createApiResponseSchema } from "./api";
import { z } from "zod";

export const VerifyGroupCodeResponse = createApiResponseSchema(
	z.object({
		users: z.record(z.string(), z.string()),
	}),
	z.enum(["invalidGroupCode"]),
);

export const LoginResponse = createApiResponseSchema(
	z.enum(["student", "admin"]),
	z.enum(["invalidCredentials", "invalidGroupCode"]),
);

export const LoginRequest = z.object({
	groupCode: z.string(),
	id: z.string(),
	password: z.string(),
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

export const MeResponse = createApiResponseSchema(
	z.discriminatedUnion("role", [
		z
			.object({
				role: z.literal("student"),
			})
			.extend(Student.shape),
		z.object({ role: z.literal("admin") }).extend(Admin.shape),
	]),
	z.enum(["invalidID", "invalidGroupCode"]),
);
export type AuthInformation = Extract<z.infer<typeof MeResponse>, { error: null }>["data"];
