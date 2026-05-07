import { z } from "zod";
import { createApiSchema } from "./api";

export const MATERIALS_TAGS = ["questions"] as const;
export const CAMPAIGN_STATES = ["created", "voting_started", "voting_ended", "finished"] as const;
export const SUPPORTED_CAMPAIGN_TYPES = ["random_select", "hungarian", "casino"] as const;

export const SupposedOrder = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("unknown"),
	}),
	z.object({
		type: z.literal("individual"),
	}),
	z.object({
		type: z.literal("inGroupsOf"),
		of: z.number().min(1),
	}),
	z.object({
		type: z.literal("inGroupsExtended"),
		groups: z.array(z.number().min(1)),
	}),
]);
export type SupposedOrderType = z.infer<typeof SupposedOrder>;

export const Vote = z.discriminatedUnion("campaignType", [
	z.object({
		campaignType: "exemption",
	}),
	z.object({
		campaignType: "random_select",
		seat: z.number(),
	}),
	z.object({
		campaignType: "hungarian",
		topSeats: z.array(z.number()),
	}),
	z.object({
		campaignType: "casino",
		distribution: z.record(z.number(), z.number()),
	}),
]);
export type VoteType = z.infer<typeof Vote>;

export const Exam = z.object({
	subject: z.string(),
	date: z.date(),
	class: z.string(),
	teacher: z.string(),
	supposedOrder: SupposedOrder,
});
export type ExamType = z.infer<typeof Exam>;

export const PreparationMaterial = z.object({
	file: z.string(),
	tag: z.string().optional(),
});
export type PreparationMaterialType = z.infer<typeof PreparationMaterial>;

export const VotingCampaign = z.object({
	type: z.enum(SUPPORTED_CAMPAIGN_TYPES),
	state: z.enum(CAMPAIGN_STATES),
});

export const [CreateExamRequest, CreateExamResponse] = createApiSchema({
	request: Exam,
	response: z.string(),
	errors: z.enum(["invalidGroupCode"]),
});

export const [GetPreparationMaterialsRequest, GetPreparationMaterialsResponse] = createApiSchema({
	request: z.object({
		tag: z.enum(MATERIALS_TAGS).optional(),
	}),
	response: z.string(),
	errors: z.enum(["invalidGroupCode", "invalidExamID"]),
});

export const [AddPreparationMaterialRequest, AddPreparationMaterialResponse] = createApiSchema({
	request: z.object({
		file: z.file(),
		tag: z.enum(MATERIALS_TAGS).optional(),
	}),
	response: z.string(),
	errors: z.enum(["invalidGroupCode", "invalidExamID", "fileUploadFailed"]),
});

export const [RemovePreparationMaterialRequest, RemovePreparationMaterialResponse] =
	createApiSchema({
		request: z.object({
			file: z.string(),
		}),
		response: z.string(),
		errors: z.enum(["invalidGroupCode", "invalidExamID"]),
	});

export const [CreateVotingCampaignRequest, CreateVotingCampaignResponse] = createApiSchema({
	request: z.object({
		type: z.enum(SUPPORTED_CAMPAIGN_TYPES),
	}),
	response: z.string(),
	errors: z.enum(["invalidGroupCode", "invalidExamID", "alreadyExists"]),
});

export const [RemoveVotingCampaignRequest, RemoveVotingCampaignResponse] = createApiSchema({
	request: z.object({
		type: z.enum(SUPPORTED_CAMPAIGN_TYPES),
	}),
	response: z.string(),
	errors: z.enum(["invalidGroupCode", "invalidExamID"]),
});

export const [StartVotingCampaignRequest, StartVotingCampaignResponse] = createApiSchema({
	request: z.object({
		id: z.string(),
	}),
	response: z.string(),
	errors: z.enum(["invalidGroupCode", "invalidExamID", "invalidCampaignID"]),
});

export const [CastVoteRequest, CastVoteResponse] = createApiSchema({
	request: Vote,
	response: z.null(),
	errors: z.enum([
		"invalidGroupCode",
		"invalidExamID",
		"invalidCampaignID",
		"mismatchedCampaignType",
	]),
});
