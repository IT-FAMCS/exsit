import { ok } from "@exsit/shared/types/api";
import { calculationError, filterVotes, VotingCampaignCalculator } from "./shared";
import { munkres } from "munkres";
import { shuffleArray } from "@/utils/math";

export const calculateHungarianResults: VotingCampaignCalculator = async (meta) => {
	if (meta.campaign.options.type !== "hungarian") return calculationError();
	let notes: string[] = [];
	const costMatrix = Array.from(
		{ length: meta.group.length },
		() => Array.from({ length: meta.group.length }, () => 1000), // NOTE: using 1000 here is safe unless there's a group with that many people
	);

	const votes = shuffleArray(Object.entries(meta.votes));
	const exemptions = Object.keys(filterVotes(meta.votes).exemptions);
	if (votes.length !== meta.group.length) return calculationError("not everyone voted");

	for (let i = 0; i < votes.length; i++) {
		if (votes[i][1].campaignType === "exemption") costMatrix[i].fill(0);
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

	const assignments = munkres(costMatrix);
	const order = Array.from(
		{ length: meta.group.length },
		(_, idx) => votes[assignments.find((arr) => arr[1] === idx)![0]][0],
	).filter((o) => !exemptions.includes(o));

	let unsatisfied = 0;
	for (let i = 0; i < order.length; i++) {
		const vote = votes.find((v) => v[0] === order[i])?.[1];
		if (!vote || vote.campaignType !== "hungarian") continue;
		if (!vote.topSeats.includes(i + 1)) unsatisfied++;
	}
	notes.push(`количество студентов, не получивших ни одно из желаемых мест: ${unsatisfied}`);

	return ok({ order, exemptions, notes });
};
