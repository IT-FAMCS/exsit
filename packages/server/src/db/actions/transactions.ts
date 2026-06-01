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
	VotingTransactionInformation,
} from "@exsit/shared/types/exams";
import { decodeTime, ulid } from "ulid";
import { db } from "../connection";
import { exams, votes, votingCampaigns, votingTransactions } from "../schema/exams";
import { ok } from "@exsit/shared/types/api";
import { ExsitJwtPayload } from "@/routers/auth";
import {
	getVotingCampaignById,
	getVotingCampaignStatistics,
	stopVotingCampaign,
} from "./campaigns";
import { eq, and, inArray, count, sql } from "drizzle-orm";
import { groups, students } from "../schema/users";
import { sendCasinoIntermediateRoundMessage, updateRandomSelectCampaignStatusMessage } from "@/bot";

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

	const isValidCasinoVote =
		existingVote &&
		existingVote.vote.campaignType !== "exemption" &&
		campaign.state.type === "casino" &&
		existingVote.vote.campaignType === "casino" &&
		campaign.state.round !== existingVote.vote.round;
	if (existingVote && !isValidCasinoVote) return { error: "alreadyVoted" };

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
			const transaction = (await getVotingTransactionById(id))!;

			const campaign = await getVotingCampaignById(transaction.campaign);
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
					const { statusMessage: _, ...state } = campaign.state as Extract<
						VotingCampaignStateType,
						{ type: "random_select" }
					>;
					const takenSeats = (
						await tx.select().from(votes).where(eq(votes.campaign, campaign.id))
					).map((s) => (s.vote as Extract<VoteType, { campaignType: "random_select" }>).seat);

					return ok({
						...state,
						campaignType: "random_select",
						group: Object.fromEntries(groupStudents.map((gs) => [gs.id, gs.fullName])),
						supposedOrder,
						takenSeats,
					});
				}
				case "hungarian":
					return ok({
						campaignType: "hungarian",
						pickAmount: campaign.options.pickAmount,
						groupSize: groupStudents.length,
						supposedOrder,
					});
				case "casino": {
					if (campaign.options.type !== "casino" || campaign.state.type !== "casino")
						return { error: "internal", details: "corrupted campaign options/state" };

					const previousVotes = (
						await tx
							.select()
							.from(votes)
							.where(and(eq(votes.campaign, campaign.id)))
					).filter((v) => v.vote.campaignType === "casino") as ((typeof votes)["$inferSelect"] & {
						vote: Extract<VoteType, { campaignType: "casino" }>;
					})[];

					const personalDistribution = previousVotes.find((v) => v.student === transaction.student)
						?.vote.distribution;
					let sharedDistribution:
						| Extract<
								z.input<typeof VotingTransactionInformation>,
								{ campaignType: "casino" }
						  >["sharedDistribution"]
						| undefined = undefined;
					if (previousVotes.length !== 0 && campaign.state.round !== 1) {
						sharedDistribution = {};
						for (let i = 1; i <= groupStudents.length; i++) {
							const filtered = previousVotes.filter((v) =>
								Object.keys(v.vote.distribution).includes(i.toString()),
							);
							sharedDistribution[i] = {
								amount: filtered.length,
								max: Math.max(...filtered.map((v) => v.vote.distribution[i])),
							};
						}
					}

					return ok({
						campaignType: "casino",
						availablePoints: campaign.options.availablePoints,
						groupSize: groupStudents.length,
						supposedOrder,
						rounds: { current: campaign.state.round, total: campaign.options.rounds },
						personalDistribution,
						sharedDistribution,
					});
				}
				case "ttc": {
					return { error: "internal", details: "TODO" };
				}
			}
		},
	);

export const castVote = async (id: string, req: z.infer<typeof CastVoteRequest>) => {
	const extra: {
		stopCampaign?: string;
	} = {};

	const result = await db.transaction(async (tx): Promise<z.input<typeof CastVoteResponse>> => {
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

		const totalVotes = (await getVotingCampaignStatistics(campaign))!.voted;

		switch (campaign.options.type) {
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
				if (req.campaignType === "random_select") {
					if (req.seat < 1 || req.seat > students.length)
						return { error: "violatedConditions", details: "invalid seat number" };

					const takenSeats = (
						await tx.select().from(votes).where(eq(votes.campaign, campaign.id))
					).map((s) => (s.vote as Extract<VoteType, { campaignType: "random_select" }>).seat);
					if (takenSeats.includes(req.seat))
						return { error: "violatedConditions", details: "seat is taken" };
				} else if (req.campaignType !== "exemption")
					return { error: "violatedConditions", details: "invalid campaign type from voter" };

				// update current
				if (state.current === students.length - 1) extra.stopCampaign = campaign.id;
				else {
					await tx
						.update(votingCampaigns)
						.set({ state: { ...state, current: state.current + 1 } })
						.where(eq(votingCampaigns.id, campaign.id));
					await updateRandomSelectCampaignStatusMessage({
						...campaign,
						state: { ...state, current: state.current + 1 },
					});
				}
				break;
			}
			case "hungarian": {
				if (req.campaignType === "exemption") break;
				if (req.campaignType !== "hungarian")
					return { error: "violatedConditions", details: "invalid campaign type from voter" };
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

				if (totalVotes + 1 === students.length) extra.stopCampaign = campaign.id;
				break;
			}
			case "casino": {
				if (req.campaignType === "exemption") break;
				if (req.campaignType !== "casino")
					return { error: "violatedConditions", details: "invalid campaign type from voter" };

				const options = campaign.options as Extract<VotingCampaignOptionsType, { type: "casino" }>;
				const state = campaign.state as Extract<VotingCampaignStateType, { type: "casino" }>;
				const roundVotes = (
					await db
						.select({ count: count() })
						.from(votes)
						.where(
							and(
								eq(votes.campaign, campaign.id),
								sql`${votes.vote} ->> '$.round' == ${state.round} or ${votes.vote} ->> '$.campaignType' == 'exemption'`,
							),
						)
				)?.at(0)?.count;
				if (roundVotes === undefined)
					return { error: "internal", details: "failed to calculate roundVotes" };

				if (req.round !== state.round)
					return { error: "violatedConditions", details: "invalid round number" };
				const totalPoints = Object.values(req.distribution).reduce((acc, cur) => acc + cur, 0);
				if (options.availablePoints !== totalPoints)
					return {
						error: "violatedConditions",
						details: "points don't add up to options.availablePoints",
					};
				if (Object.values(req.distribution).some((v) => v < 0 || v > options.availablePoints))
					return {
						error: "violatedConditions",
						details: "some points in the distribution go outside the allowed range",
					};

				state.distribution[transaction.student] = req.distribution;
				if (roundVotes + 1 === students.length) {
					if (state.round !== options.rounds) {
						await sendCasinoIntermediateRoundMessage(campaign);
						state.round++;
					} else extra.stopCampaign = campaign.id;
				}
				console.log(roundVotes + 1, students.length, state);
				await tx.update(votingCampaigns).set({ state }).where(eq(votingCampaigns.id, campaign.id));
				break;
			}
		}

		await tx.delete(votingTransactions).where(eq(votingTransactions.id, id));
		await tx
			.insert(votes)
			.values({
				student: transaction.student,
				campaign: transaction.campaign,
				vote: req,
				timestamp: new Date(),
			})
			.onConflictDoUpdate({
				target: [votes.student, votes.campaign],
				set: { vote: req, timestamp: new Date() },
			});
		return ok(null);
	});

	if (extra.stopCampaign) await stopVotingCampaign(extra.stopCampaign);
	return result;
};
