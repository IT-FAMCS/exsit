import { createApiResponseSchema } from "./api";
import { z } from "zod";

export const VerifyGroupCodeResponse = createApiResponseSchema(
	z.object({
		students: z.record(z.string(), z.string()),
	}),
	z.enum(["invalidGroupCode"]),
);

export const LoginResponse = createApiResponseSchema(
	z.null(),
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

export type GroupType = z.infer<typeof Group>;
export type StudentType = z.infer<typeof Student>;

export const MeResponse = createApiResponseSchema(Student, z.enum(["invalidID", "invalidGroupCode"]));
