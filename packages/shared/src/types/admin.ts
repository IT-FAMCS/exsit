import { z } from "zod";
import { createApiSchema } from "./api";

export const [CreateGroupRequest, CreateGroupResponse] = createApiSchema({
	request: z.object({
		code: z.string(),
		course: z.number(),
		num: z.number(),
		department: z.string().nullable(),
		notificationChannel: z.string().nullable(),
	}),
	response: z.string(),
	errors: z.enum(["taken", "invalidCourse"]),
});

export const [AddStudentsToGroupRequest, AddStudentsToGroupResponse] = createApiSchema({
	request: z.object({
		students: z.array(
			z.object({
				fullName: z.string(),
				informalFirstName: z.string(),
				password: z.string(),
			}),
		),
	}),
	response: z.null(),
	errors: z.enum(["invalidGroupCode"]),
});

export const [CreateAdminRequest, CreateAdminResponse] = createApiSchema({
	request: z.object({
		id: z.string(),
		name: z.string().optional(),
		password: z.string(),
	}),
	response: z.null(),
	errors: z.enum(["taken"]),
});
