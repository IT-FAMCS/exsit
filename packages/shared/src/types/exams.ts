import { z } from "zod";
import { createApiSchema } from "./api";
import { FileMetadata } from "./files";

export const MATERIALS_TAGS = ["questions"] as const;
export const MATERIALS_TYPES = ["file", "link"] as const;

export const CAMPAIGN_STATUSES = ["created", "voting_started", "voting_ended", "finished"] as const;
export const SUPPORTED_CAMPAIGN_TYPES = ["random_select", "hungarian", "casino", "ttc"] as const;

export const CAMPAIGN_TYPES_MESSAGES: Record<VotingCampaignType["options"]["type"], string> = {
	casino: "Казино",
	hungarian: "Венгерский алгоритм",
	random_select: "Перемешанная выборка",
	ttc: "Высший торговый цикл",
};
export const CAMPAIGN_STATUSES_MESSAGES: Record<VotingCampaignType["status"], string> = {
	created: "Голосование создано",
	finished: "Голосование завершено",
	voting_ended: "Голосование окончено",
	voting_started: "Голосование начато",
};

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
		campaignType: z.literal("exemption"),
	}),
	z.object({
		campaignType: z.literal("random_select"),
		seat: z.number(),
	}),
	z.object({
		campaignType: z.literal("hungarian"),
		topSeats: z.array(z.number()),
	}),
	z.object({
		campaignType: z.literal("casino"),
		distribution: z.record(z.number(), z.number()),
	}),
	z.object({
		campaignType: z.literal("ttc"),
		preferred: z.number().nullable(),
	}),
]);
export type VoteType = z.infer<typeof Vote>;

export const VotingTransactionInformation = z
	.discriminatedUnion("campaignType", [
		z.object({
			campaignType: z.literal("random_select"),
			group: z.record(z.string(), z.string()),
			order: z.array(z.number()),
			current: z.number(),
			takenSeats: z.array(z.number()),
		}),
		z.object({
			campaignType: z.literal("hungarian"),
			groupSize: z.number(),
			pickAmount: z.number(),
		}),
		z.object({
			campaignType: z.literal("casino"),
			groupSize: z.number(),
			totalRounds: z.number(),
			availablePoints: z.number(),
			distribution: z.record(z.number(), z.object({ amount: z.number(), max: z.number() })),
		}),
		z.object({
			campaignType: z.literal("ttc"),
			assignedSeat: z.number(),
			state: z.enum(["satisfied", "select"]),
			takenSeats: z.array(z.number()),
		}),
	])
	.and(
		z.object({
			supposedOrder: SupposedOrder,
		}),
	);
export type VotingTransactionInformationType = z.infer<typeof VotingTransactionInformation>;

export const VotingCampaignState = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("random_select"),
		order: z.array(z.number()),
		current: z.number(),
	}),
	z.object({
		type: z.literal("hungarian"),
	}),
	z.object({
		type: z.literal("casino"),
		round: z.number(),
		distribution: z.record(z.string(), z.record(z.number(), z.number())),
	}),
	z.object({
		type: z.literal("ttc"),
		state: z.enum(["satisfied", "select"]),
		seats: z.record(z.number(), z.number()),
	}),
]);
export type VotingCampaignStateType = z.infer<typeof VotingCampaignState>;

export const VotingCampaignOptions = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("random_select"),
	}),
	z.object({
		type: z.literal("hungarian"),
		pickAmount: z.coerce
			.number<string>()
			.optional()
			.transform((n) => n ?? 3),
	}),
	z.object({
		type: z.literal("casino"),
		availablePoints: z.coerce
			.number<string>()
			.optional()
			.transform((n) => n ?? 10),
	}),
	z.object({
		type: z.literal("ttc"),
	}),
]);
export type VotingCampaignOptionsType = z.infer<typeof VotingCampaignOptions>;

export const Exam = z.object({
	subject: z.string(),
	date: z.coerce.date<string>().nullable(),
	class: z.string().nullable(),
	teacher: z.string(),
	supposedOrder: SupposedOrder.nullable(),
});
export type ExamType = z.infer<typeof Exam>;

export const PreparationMaterial = z
	.discriminatedUnion("type", [
		z.object({
			type: z.literal("file"),
			meta: FileMetadata,
			id: z.string(),
		}),
		z.object({
			type: z.literal("link"),
			link: z.string(),
		}),
	])
	.and(
		z.object({
			tag: z.string().optional(),
			title: z.string().optional(),
		}),
	);
export type PreparationMaterialType = z.infer<typeof PreparationMaterial>;
export const PreparationMaterials = z.array(PreparationMaterial);
export type PreparationMaterialsType = z.infer<typeof PreparationMaterials>;

export const VotingCampaign = z.object({
	options: VotingCampaignOptions,
	status: z.enum(CAMPAIGN_STATUSES),
});
export type VotingCampaignType = z.infer<typeof VotingCampaign>;
export const VotingCampaigns = z.record(z.string(), VotingCampaign);
export type VotingCampaignsType = z.infer<typeof VotingCampaigns>;

export const VotingCampaignResults = z.object({
	notes: z.array(z.string()).default([]),
	order: z.array(z.number()),
});
export type VotingCampaignResultsType = z.infer<typeof VotingCampaignResults>;

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
		request: z
			.discriminatedUnion("type", [
				z.object({
					type: z.literal("file"),
					file: z.file(),
				}),
				z.object({
					type: z.literal("link"),
					link: z.string(),
				}),
			])
			.and(
				z.object({
					title: z.string().optional(),
					tag: z.enum(MATERIALS_TAGS).optional(),
				}),
			),
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
	response: z.record(
		z.string(),
		VotingCampaign.extend(
			z.object({
				started: z.coerce.date<string>().optional(),
				stopped: z.coerce.date<string>().optional(),
				voted: z.number(),
				total: z.number(),
			}).shape,
		),
	),
	errors: z.enum(["invalidGroupCode", "invalidExamID", "failedToGetStatistics"]),
});

export const [CreateVotingCampaignRequest, CreateVotingCampaignResponse] = createApiSchema({
	request: VotingCampaignOptions,
	response: z.string(),
	errors: z.enum(["invalidGroupCode", "invalidExamID", "alreadyExists"]),
});

export const [RemoveVotingCampaignRequest, RemoveVotingCampaignResponse] = createApiSchema({
	errors: z.enum(["invalidGroupCode", "invalidExamID", "invalidCampaignID"]),
});

export const [StartVotingCampaignRequest, StartVotingCampaignResponse] = createApiSchema({
	errors: z.enum(["invalidGroupCode", "invalidExamID", "invalidCampaignID"]),
});

export const [StopVotingCampaignRequest, StopVotingCampaignResponse] = createApiSchema({
	errors: z.enum(["invalidGroupCode", "invalidExamID", "invalidCampaignID"]),
});

export const [CalculateVotingCampaignResultsRequest, CalculateVotingCampaignResultsResponse] =
	createApiSchema({
		response: VotingCampaignResults,
		errors: z.enum([
			"invalidGroupCode",
			"invalidExamID",
			"invalidCampaignID",
			"votingNotEnded",
			"calculationError",
		]),
	});

export const [CastVoteRequest, CastVoteResponse] = createApiSchema({
	request: Vote,
	response: z.null(),
	errors: z.enum([
		"invalidGroupID",
		"invalidExamID",
		"invalidCampaignID",
		"invalidTransactionID",
		"violatedConditions",
	]),
});

export const [, RequestVotingTransactionResponse] = createApiSchema({
	response: z.string(),
	errors: z.enum([
		"invalidGroupCode",
		"invalidCampaignID",
		"adminsCannotVote",
		"campaignNotStarted",
		"campaignStopped",
		"alreadyVoted",
	]),
});

export const [, GetVotingTransactionInformationResponse] = createApiSchema({
	response: VotingTransactionInformation,
	errors: z.enum(["invalidCampaignID", "invalidTransactionID", "invalidExamID", "invalidGroupID"]),
});
