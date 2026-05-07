import { z } from "zod";

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
    
});