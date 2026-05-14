import z from "zod";
import { getGroupIdByStudent, getGroupStudents } from "./groups";
import {
	CastVoteRequest,
	CastVoteResponse,
	GetVotingTransactionInformationResponse,
	RequestVotingTransactionResponse,
	VoteType,
	VotingCampaignOptionsType,
	VotingCampaignStateType,
} from "@exsit/shared/types/exams";
import { decodeTime, ulid } from "ulid";
import { db } from "../connection";
import { exams, votes, votingCampaigns, votingTransactions } from "../schema/exams";
import { ok } from "@exsit/shared/types/api";
import { ExsitJwtPayload } from "@/routers/auth";
import { getVotingCampaignById } from "./campaigns";
import { eq, and, inArray } from "drizzle-orm";
import { groups, students } from "../schema/users";

export const cleanupStaleVotingTransactions = async () => {
	await db.transaction(async (tx) => {
		const transactions = await tx.select().from(votingTransactions);
		const staleTransactions = transactions.filter(
			(t) => Date.now() - decodeTime(t.id.slice(3)) >= 60 * 60 * 1000,
		);
		await tx.delete(votingTransactions).where(
			inArray(
				votingTransactions.id,
				staleTransactions.map((st) => st.id),
			),
		);
		console.log(`cleaned ${staleTransactions.length} stale voting transaction(s)`);
	});
};

export const removeVotingTransaction = async (id: string) =>
	await db.delete(votingTransactions).where(eq(votingTransactions.id, id));
export const votingTransactionExists = async (id: string) => !!(await getVotingTransactionById(id));
export const getVotingTransactionById = async (id: string) =>
	(await db.select().from(votingTransactions).where(eq(votingTransactions.id, id)))?.at(0);

export const createVotingTransaction = async (
	payload: ExsitJwtPayload,
	campaignId: string,
): Promise<z.input<typeof RequestVotingTransactionResponse>> => {
	if (payload.role === "admin") return { error: "adminsCannotVote" };
	const group = getGroupIdByStudent(payload.id);
	if (!group) return { error: "invalidGroupCode" };

	const campaign = await getVotingCampaignById(campaignId);
	if (!campaign) return { error: "invalidCampaignID" };
	if (campaign.status === "created") return { error: "campaignNotStarted" };
	else if (campaign.status === "voting_ended" || campaign.status === "finished")
		return { error: "campaignStopped" };

	const existingVote = (
		await db
			.select()
			.from(votes)
			.where(and(eq(votes.student, payload.id), eq(votes.campaign, campaignId)))
	)?.at(0);
	if (existingVote) return { error: "alreadyVoted" };

	const existingTransaction = (
		await db
			.select()
			.from(votingTransactions)
			.where(
				and(
					eq(votingTransactions.student, payload.id),
					eq(votingTransactions.campaign, campaignId),
				),
			)
	)?.at(0);
	if (existingTransaction) return ok(existingTransaction.id);

	const id = `VT-${ulid()}`;
	await db.insert(votingTransactions).values({
		id,
		student: payload.id,
		campaign: campaignId,
	});
	return ok(id);
};

export const getTransactionInformation = async (id: string) =>
	await db.transaction(
		async (tx): Promise<z.input<typeof GetVotingTransactionInformationResponse>> => {
			const campaign = (
				await tx
					.select()
					.from(votingCampaigns)
					.leftJoin(votingTransactions, eq(votingCampaigns.id, votingTransactions.campaign))
					.where(eq(votingTransactions.id, id))
			)?.at(0)?.voting_campaigns;
			if (!campaign) return { error: "invalidCampaignID" };

			const supposedOrder = (await tx.select().from(exams).where(eq(exams.id, campaign.exam)))?.at(
				0,
			)?.supposedOrder;
			if (!supposedOrder) return { error: "invalidExamID" };

			const groupStudents = (
				await tx
					.select()
					.from(students)
					.leftJoin(groups, eq(students.group, groups.id))
					.leftJoin(exams, eq(exams.group, groups.id))
					.leftJoin(votingCampaigns, eq(votingCampaigns.exam, exams.id))
					.where(eq(votingCampaigns.id, campaign.id))
			).map((gs) => gs.students);
			if (!students) return { error: "invalidGroupID" };

			switch (campaign.options.type) {
				case "random_select": {
					const state = campaign.state as Extract<
						VotingCampaignStateType,
						{ type: "random_select" }
					>;
					const takenSeats = (
						await tx.select().from(votes).where(eq(votes.campaign, campaign.id))
					).map((s) => (s.vote as Extract<VoteType, { campaignType: "random_select" }>).seat);

					return ok({
						campaignType: "random_select",
						group: Object.fromEntries(groupStudents.map((gs) => [gs.id, gs.fullName])),
						supposedOrder,
						takenSeats,
						...state,
					});
				}
				case "hungarian":
					return ok({
						campaignType: "hungarian",
						pickAmount: campaign.options.pickAmount,
						total: groupStudents.length,
						supposedOrder,
					});
				case "casino":
					return ok({
						campaignType: "casino",
						availablePoints: campaign.options.availablePoints,
						total: groupStudents.length,
						supposedOrder,
					});
			}
		},
	);

export const castVote = async (id: string, req: z.infer<typeof CastVoteRequest>) =>
	await db.transaction(async (tx): Promise<z.input<typeof CastVoteResponse>> => {
		const transaction = (await getVotingTransactionById(id))!;

		const group = await getGroupIdByStudent(transaction.student);
		if (!group) return { error: "invalidGroupID" };
		const students = (await getGroupStudents(group))!;

		const campaign = await getVotingCampaignById(transaction.campaign);
		if (!campaign) return { error: "invalidCampaignID" };
		if (req.campaignType !== "exemption" && req.campaignType !== campaign.options.type)
			return {
				error: "violatedConditions",
				details: `mismatched campaign type (${req.campaignType} and ${campaign.options.type})`,
			};

		switch (req.campaignType) {
			case "random_select": {
				const state = campaign.state as Extract<VotingCampaignStateType, { type: "random_select" }>;
				const currentStudent = students.at(state.order[state.current]);
				if (!currentStudent)
					return {
						error: "internal",
						details: "campaign state is corrupted (invalid order/current)",
					};
				if (currentStudent.id !== transaction.student)
					return { error: "violatedConditions", details: "it's not your turn to vote" };
				if (req.seat < 1 || req.seat > students.length)
					return { error: "violatedConditions", details: "invalid seat number" };

				// update current
				if (state.current === students.length - 1) {
					console.warn("FINISH random_select CAMPAIGN");
					// TODO: FINISH CAMPAIGN
				} else
					await tx
						.update(votingCampaigns)
						.set({ state: { ...state, current: state.current + 1 } })
						.where(eq(votingCampaigns.id, transaction.campaign));
				break;
			}
			case "hungarian": {
				const options = campaign.options as Extract<
					VotingCampaignOptionsType,
					{ type: "hungarian" }
				>;
				if (req.topSeats.length !== options.pickAmount)
					return {
						error: "violatedConditions",
						details: "picked seats amount doesn't match campaign settings",
					};
				if (req.topSeats.some((s) => s < 1 || s > students.length))
					return { error: "violatedConditions", details: "invalid seat numbers" };
				break;
			}
			case "casino": {
				const options = campaign.options as Extract<VotingCampaignOptionsType, { type: "casino" }>;
				if (Object.keys(req.distribution).some((s) => Number(s) < 1 || Number(s) > students.length))
					return { error: "violatedConditions", details: "invalid seat numbers" };
				const total = Object.values(req.distribution).reduce((acc, cur) => acc + cur, 0);
				if (total !== options.availablePoints)
					return {
						error: "violatedConditions",
						details: `points don't add up to the campaign's required value (${options.availablePoints})`,
					};
				break;
			}
			case "exemption":
				break;
		}

		await tx.delete(votingTransactions).where(eq(votingTransactions.id, id));
		await tx
			.insert(votes)
			.values({ student: transaction.student, vote: req, campaign: transaction.campaign });
		return ok(null);
	});
