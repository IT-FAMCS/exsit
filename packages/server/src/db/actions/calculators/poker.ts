import { shuffleArray } from "@/utils/math";
import munkres from "munkres";
import { calculationError, filterVotes, VotingCampaignCalculator } from "./shared";
import { ok } from "@exsit/shared/types/api";

export const POKER_CHIPS_MAX = 10;
export const calculatePokerResults: VotingCampaignCalculator = async (meta) => {
	if (meta.campaign.options.type !== "poker") return calculationError();
	let notes: string[] = [];

	const exemptions = Object.keys(filterVotes(meta.votes).exemptions);
	const votes = shuffleArray(Object.entries(meta.votes).filter(([id]) => !exemptions.includes(id)));
	if (Object.keys(meta.votes).length !== meta.group.length)
		return calculationError("not everyone voted");

	const costMatrix = Array.from(
		{ length: votes.length },
		() => Array.from({ length: meta.group.length }, () => 1000), // NOTE: using 1000 here is safe unless there's a group with that many people
	);

	for (let i = 0; i < votes.length; i++) {
		const vote = votes[i][1];
		if (vote.campaignType !== "poker")
			return calculationError(`invalid vote type seen from ${votes[i][0]}: ${vote.campaignType}`);
		for (const [seat, value] of Object.entries(vote.distribution))
			costMatrix[i][Number(seat) - 1] = POKER_CHIPS_MAX - value;
	}

	const assignments = munkres(costMatrix);
	const order = Array.from({ length: meta.group.length }, (_, seatIdx) => {
		const match = assignments.find((arr) => arr[1] === seatIdx);
		return match ? votes[match[0]][0] : "";
	});

	let unsatisfied = 0;
	for (let i = 0; i < order.length; i++) {
		if (!order[i]) continue;
		const vote = meta.votes[order[i]];
		if (!vote || vote.campaignType !== "poker") continue;
		if ((vote.distribution[i + 1] ?? 1) < 5) unsatisfied++;
	}
	notes.push(
		`количество студентов, которые получили места с оценкой желания 4 и ниже: ${unsatisfied}`,
	);

	return ok({ order, exemptions, notes });
};
