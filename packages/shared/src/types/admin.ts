import { z } from "zod";
import { createApiResponseSchema } from "./api";

export const CreateGroupRequest = z.object({
	course: z.number(),
	num: z.number(),
	department: z.string().nullable(),
});

export const CreateGroupResponse = createApiResponseSchema(
	z.null(),
	z.enum(["taken", "invalidCourse"]),
);

export const AddStudentsToGroupRequest = z.object({
	students: z.array(
		z.object({
			fullName: z.string(),
			informalFirstName: z.string(),
			password: z.string(),
		}),
	),
});

export const AddStudentsToGroupResponse = createApiResponseSchema(
	z.null(),
	z.enum(["invalidGroupCode"]),
);

export const CreateAdminRequest = z.object({
	id: z.string(),
	name: z.string().optional(),
	password: z.string(),
});

export const CreateAdminResponse = createApiResponseSchema(z.null(), z.enum(["taken"]));
