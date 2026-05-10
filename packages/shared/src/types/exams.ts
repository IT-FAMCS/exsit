import { z } from "zod";
import { createApiSchema } from "./api";
import { FileMetadata } from "./files";

export const MATERIALS_TAGS = ["questions"] as const;
export const MATERIALS_TYPES = ["file", "link"] as const;
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
	date: z.coerce.date<string>().nullable(),
	class: z.string().nullable(),
	teacher: z.string(),
	supposedOrder: SupposedOrder.nullable(),
});
export type ExamType = z.infer<typeof Exam>;

export const PreparationMaterial = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("file"),
		meta: FileMetadata,
		id: z.string(),
		tag: z.string().optional(),
	}),
	z.object({
		type: z.literal("link"),
		link: z.string(),
		tag: z.string().optional(),
	}),
]);
export type PreparationMaterialType = z.infer<typeof PreparationMaterial>;
export const PreparationMaterials = z.array(PreparationMaterial);
export type PreparationMaterialsType = z.infer<typeof PreparationMaterials>;

export const VotingCampaign = z.object({
	type: z.enum(SUPPORTED_CAMPAIGN_TYPES),
	state: z.enum(CAMPAIGN_STATES),
});
export type VotingCampaignType = z.infer<typeof VotingCampaign>;
export const VotingCampaigns = z.record(z.string(), VotingCampaign);
export type VotingCampaignsType = z.infer<typeof VotingCampaigns>;

export const [CreateExamRequest, CreateExamResponse] = createApiSchema({
	request: Exam,
	response: z.string(),
	errors: z.enum(["invalidGroupCode"]),
});

export const [, GetExamsResponse] = createApiSchema({
	response: z.record(z.string(), Exam),
	errors: z.enum(["invalidGroupCode"]),
});

export const [, GetSpecificExamResponse] = createApiSchema({
	response: Exam,
	errors: z.enum(["invalidGroupCode", "invalidExamID"]),
});

export const [GetPreparationMaterialsRequest, GetPreparationMaterialsResponse] = createApiSchema({
	request: z.object({
		tag: z.enum(MATERIALS_TAGS).optional(),
	}),
	response: z.array(PreparationMaterial),
	errors: z.enum(["invalidGroupCode", "invalidExamID", "missingFileMetadata"]),
});

export const [UploadPreparationMaterialRequest, UploadPreparationMaterialResponse] =
	createApiSchema({
		request: z.discriminatedUnion("type", [
			z.object({
				type: z.literal("file"),
				file: z.file(),
				tag: z.enum(MATERIALS_TAGS).optional(),
			}),
			z.object({
				type: z.literal("link"),
				link: z.string(),
				tag: z.enum(MATERIALS_TAGS).optional(),
			}),
		]),
		response: z.null(),
		errors: z.enum(["invalidGroupCode", "invalidExamID", "fileUploadFailed"]),
	});

export const [RemovePreparationMaterialRequest, RemovePreparationMaterialResponse] =
	createApiSchema({
		request: z.object({
			id: z.string(),
		}),
		response: z.null(),
		errors: z.enum(["invalidGroupCode", "invalidExamID", "invalidFileID"]),
	});

export const [GetVotingCampaignsRequest, GetVotingCampaignsResponse] = createApiSchema({
	response: z.record(z.string(), VotingCampaign),
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
	errors: z.enum(["invalidGroupCode", "invalidExamID", "invalidCampaignID"]),
});

export const [StartVotingCampaignRequest, StartVotingCampaignResponse] = createApiSchema({
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
