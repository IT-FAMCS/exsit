import { ok } from "@exsit/shared/types/api";
import { calculationError, filterVotes, VotingCampaignCalculator } from "./shared";

export const calculateRandomSelectResults: VotingCampaignCalculator = async (meta) => {
	if (meta.campaign.options.type !== "random_select") return calculationError();
	// order is already enforced by the casting vote method
	// so we can blindly copy the votes
	let order: string[] = new Array(meta.group.length).fill("");
	const exemptions = Object.keys(filterVotes(meta.votes)[0]);
	for (const [voter, vote] of Object.entries(meta.votes)) {
		if (vote.campaignType === "exemption") continue;
		if (vote.campaignType !== "random_select")
			return calculationError(`invalid vote type seen from ${voter}: ${vote.campaignType}`);
		order[vote.seat - 1] = voter;
	}
	order = order.filter((o) => o !== "");
	return ok({ order, exemptions, notes: [] });
};
