import { ok } from "@exsit/shared/types/api";
import { calculationError, filterVotes, VotingCampaignCalculator } from "./shared";

type Bid = {
	student: string;
	seat: number;
	points: number;
	timestamp: number;
};

export const calculateCasinoResults: VotingCampaignCalculator = async (meta) => {
	if (meta.campaign.options.type !== "casino") return calculationError();

	const notes: string[] = [];
	const votes = Object.entries(meta.votes);
	if (votes.length !== meta.group.length) return calculationError("not everyone voted");
	const { exemptions, other } = filterVotes(meta.votes);

	const bids: Bid[] = [];
	for (const [student, vote] of Object.entries(other)) {
		if (vote.campaignType !== "casino")
			return calculationError(`invalid vote type seen from ${student}: ${vote.campaignType}`);
		for (let seat = 1; seat <= meta.group.length; seat++)
			bids.push({
				student,
				seat,
				points: vote.distribution[seat] ?? 0,
				timestamp: meta.timestamps[student]?.getTime() ?? Date.now(),
			});
	}
	bids.sort((a, b) => b.points - a.points || a.timestamp - b.timestamp);

	const assignedSeats = new Map<number, string>();
	const assignedStudents = new Set<string>();
	let tiesCounted = 0;
	// greedy assignment
	for (const bid of bids) {
		if (assignedSeats.has(bid.seat) || assignedStudents.has(bid.student)) continue;
		const ties = bids.filter(
			(b) => b.seat === bid.seat && b.points === bid.points && !assignedStudents.has(b.student),
		);
		if (ties.length > 1) tiesCounted++;
		assignedSeats.set(bid.seat, bid.student);
		assignedStudents.add(bid.student);
	}
	notes.push(`случилось состязаний за одно место: <b>${tiesCounted}</b>`);

	// leftover + exempt students
	const unassignedStudents = [
		...Object.keys(other).filter((s) => !assignedStudents.has(s)),
		...Object.keys(exemptions),
	];
	notes.push(
		`кол-во студентов, распределённых по оставшимся местам: <b>${unassignedStudents.length}</b>`,
	);
	for (let seat = 1; seat <= meta.group.length; seat++) {
		if (assignedSeats.has(seat) || unassignedStudents.length === 0) continue;
		const student = unassignedStudents.pop()!;
		assignedSeats.set(seat, student);
		assignedStudents.add(student);
	}

	const rawOrder = Array.from({ length: meta.group.length }, (_, i) => assignedSeats.get(i + 1)!);
	const order = rawOrder.filter((o) => !Object.keys(exemptions).includes(o));
	return ok({ order, exemptions: Object.keys(exemptions), notes });
};
