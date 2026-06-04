import { z } from "zod";
import { createApiSchema } from "./api";
import { Vote } from "./exams";

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

export const [NotifyGroupRequest, NotifyGroupResponse] = createApiSchema({
	request: z.object({
		text: z.string(),
		parseMode: z.enum(["MarkdownV2", "HTML"]).default("HTML"),
	}),
	response: z.null(),
	errors: z.enum(["invalidGroupID", "notificationsDisabled"]),
});

export const [, GetAllGroupsResponse] = createApiSchema({
	response: z.record(z.string(), z.string()),
});

export const [, GetAllCampaignVotesResponse] = createApiSchema({
	response: z.array(z.object({ student: z.string(), vote: Vote, timestamp: z.coerce.date() })),
});
