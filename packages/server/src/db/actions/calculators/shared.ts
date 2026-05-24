import { votingCampaigns } from "@/db/schema/exams";
import { students } from "@/db/schema/users";
import {
	CalculateVotingCampaignResultsResponse,
	SUPPORTED_CAMPAIGN_TYPES,
	VoteType,
} from "@exsit/shared/types/exams";
import z from "zod";
import { calculateCasinoResults } from "./casino";
import { calculateHungarianResults } from "./hungarian";
import { calculateRandomSelectResults } from "./random-select";
import { calculateTtcResults } from "./ttc";

export type VotingCampaignCalculatorMetadata = {
	group: (typeof students)["$inferSelect"][];
	campaign: (typeof votingCampaigns)["$inferSelect"];
	votes: Record<string, VoteType>;
	timestamps: Record<string, Date>;
};

export type VotingCampaignCalculator = (
	meta: VotingCampaignCalculatorMetadata,
) => Promise<z.infer<typeof CalculateVotingCampaignResultsResponse>>;

export const VOTING_CAMPAIGN_CALCULATORS: Record<
	(typeof SUPPORTED_CAMPAIGN_TYPES)[number],
	VotingCampaignCalculator
> = {
	casino: calculateCasinoResults,
	hungarian: calculateHungarianResults,
	random_select: calculateRandomSelectResults,
	ttc: calculateTtcResults,
};

export const filterVotes = (
	votes: Record<string, VoteType>,
): { exemptions: Record<string, VoteType>; other: Record<string, VoteType> } => {
	const exemptions = Object.fromEntries(
		Object.entries(votes).filter((kv) => kv[1].campaignType === "exemption"),
	);
	return {
		exemptions,
		other: Object.fromEntries(
			Object.entries(votes).filter((kv) => !Object.keys(exemptions).includes(kv[0])),
		),
	};
};

export const calculationError = (
	details?: string,
): z.infer<typeof CalculateVotingCampaignResultsResponse> => ({
	error: "calculationError",
	details,
});
