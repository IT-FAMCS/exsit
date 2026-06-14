import { shuffleArray } from "@/utils/math";
import munkres from "munkres";
import {
	calculationError,
	filterVotes,
	VotingCampaignCalculator,
	VotingCampaignCalculatorMetadata,
} from "./shared";
import { ok } from "@exsit/shared/types/api";

const fillMissingVotes = (
	meta: VotingCampaignCalculatorMetadata,
): [string[], VotingCampaignCalculatorMetadata["votes"]] => {
	const GROUP_SIZE = meta.group.length;
	const CHIP_AMOUNT = Math.ceil(GROUP_SIZE / POKER_CHIPS_MAX);

	const fill = (distribution: Record<number, number>) => {
		const copy = { ...distribution };
		const pool: number[] = Array.from({ length: POKER_CHIPS_MAX }, (_, i) =>
			Array(CHIP_AMOUNT).fill(i + 1),
		).flat();

		for (const value of Object.values(distribution)) {
			const index = pool.indexOf(value);
			if (index !== -1) pool.splice(index, 1);
		}
		for (const unusedSeat of Array.from({ length: GROUP_SIZE }, (_, i) => i + 1).filter(
			(v) => !(v in distribution),
		)) {
			const chip = pool.pop();
			if (!chip) throw new Error("pool was not big enough to fill distribution");
			copy[unusedSeat] = chip;
		}

		return copy;
	};

	const notes: string[] = [];
	const result = { ...meta.votes };
	const missing = meta.group.filter((g) => !(g.id in meta.votes));
	const partiallyFilled = meta.group.filter((g) => {
		const vote = meta.votes[g.id];
		if (!vote) return false;
		return vote.campaignType === "poker" && Object.values(vote.distribution).length !== GROUP_SIZE;
	});

	for (const student of missing) {
		result[student.id] = { campaignType: "poker", distribution: fill({}) };
		notes.push(`пенальти: ${student.fullName} (полностью, ${GROUP_SIZE}/${GROUP_SIZE})`);
	}
	for (const student of partiallyFilled) {
		const vote = result[student.id];
		if (vote.campaignType !== "poker") continue;
		result[student.id] = { ...vote, distribution: fill(vote.distribution) };
		notes.push(
			`пенальти: ${student.fullName} (частично, ${Object.values(vote.distribution).length}/${GROUP_SIZE})`,
		);
	}
	return [notes, result];
};

export const POKER_CHIPS_MAX = 10;
export const calculatePokerResults: VotingCampaignCalculator = async (meta) => {
	if (meta.campaign.options.type !== "poker") return calculationError();
	let notes: string[] = [];

	const [punishedNotes, filledVotes] = fillMissingVotes(meta);
	notes.push(...punishedNotes);

	const exemptions = Object.keys(filterVotes(filledVotes).exemptions);
	const votes = shuffleArray(
		Object.entries(filledVotes).filter(([id]) => !exemptions.includes(id)),
	);
	if (Object.keys(filledVotes).length !== meta.group.length)
		return calculationError("not enough votes even after fillMissingVotes");

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
		const vote = votes.find((v) => v[0] === order[i])?.[1];
		if (!vote || vote.campaignType !== "poker") continue;
		if (vote.distribution[i + 1]! < 5) unsatisfied++;
	}
	notes.push(
		`количество студентов, которые получили места с оценкой желания 4 и ниже: ${unsatisfied}`,
	);

	return ok({
		order: order.filter((o) => o),
		exemptions,
		notes,
		hooks: {
			studentSuffix: (student) => {
				const index = order.indexOf(student);

				const finalVote = votes.find((v) => v[0] === student)?.[1];
				if (index === -1) return undefined;
				if (!finalVote || finalVote.campaignType !== "poker") return undefined;
				const originalVote = meta.votes[student];

				const punished =
					index + 1 in finalVote.distribution &&
					!(
						originalVote &&
						originalVote.campaignType === "poker" &&
						index + 1 in originalVote.distribution
					);
				return `(${finalVote.distribution[index + 1]}${punished ? ", пенальти" : ""})`;
			},
		},
	});
};
