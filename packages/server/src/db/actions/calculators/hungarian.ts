import { ok } from "@exsit/shared/types/api";
import { calculationError, VotingCampaignCalculator } from "./shared";
import { munkres } from "munkres";

export const calculateHungarianResults: VotingCampaignCalculator = async (meta) => {
	if (meta.campaign.options.type !== "hungarian") return calculationError();
	const costMatrix = Array.from({ length: meta.group.length }, () =>
		Array.from({ length: meta.group.length }, () => +Infinity),
	);

	const votes = Object.entries(meta.votes);
	if (votes.length !== meta.group.length) return calculationError("not everyone voted");

	for (let i = 0; i < votes.length; i++) {
		if (votes[i][1].campaignType === "exemption")
			costMatrix[i] = Array.from({ length: meta.group.length }, () => -Infinity);
		else {
			const vote = votes[i][1];
			if (vote.campaignType !== "hungarian")
				return calculationError(`invalid vote type seen from ${votes[i][0]}: ${vote.campaignType}`);
			if (vote.topSeats.length !== meta.campaign.options.pickAmount)
				return calculationError(
					`vote.topSeats.length !== campaign.options.pickAmount (${vote.topSeats.length} !== ${meta.campaign.options.pickAmount})`,
				);
			for (let j = 0; j < vote.topSeats.length; j++) costMatrix[i][vote.topSeats[j] - 1] = j + 1;
		}
	}

	console.log(costMatrix);
	const assignments = munkres(costMatrix);
	console.log(assignments);

	const order = Array.from({ length: meta.group.length }, () => 0);
	for (const [voteIndex, seat] of assignments)
		order[meta.group.findIndex((s) => s.id === votes[voteIndex][0])] = seat;
	return ok({ order, notes: [] });
};
