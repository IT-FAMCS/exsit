import z from "zod";
import { getGroupByStudentId } from "./groups";
import {
	GetVotingTransactionInformationResponse,
	RequestVotingTransactionResponse,
} from "@exsit/shared/types/exams";
import { decodeTime, ulid } from "ulid";
import { db } from "../connection";
import { exams, votingCampaigns, votingTransactions } from "../schema/exams";
import { ok } from "@exsit/shared/types/api";
import { ExsitJwtPayload } from "@/routers/auth";
import { getVotingCampaignById } from "./campaigns";
import { eq, and, inArray } from "drizzle-orm";
import { groups, students } from "../schema/users";

export const cleanupStaleVotingTransacions = async () => {
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
	const group = getGroupByStudentId(payload.id);
	if (!group) return { error: "invalidGroupCode" };

	const campaign = await getVotingCampaignById(campaignId);
	if (!campaign) return { error: "invalidCampaignID" };
	if (campaign.state === "created") return { error: "campaignNotStarted" };
	else if (campaign.state === "voting_ended" || campaign.state === "finished")
		return { error: "campaignStopped" };

	const existing = (
		await db
			.select()
			.from(votingTransactions)
			.where(
				and(
					eq(votingTransactions.student, payload.id),
					eq(votingTransactions.votingCampaign, campaignId),
				),
			)
	)?.at(0);
	if (existing) return ok(existing.id);

	const id = `VT-${ulid()}`;
	await db.insert(votingTransactions).values({
		id,
		student: payload.id,
		votingCampaign: campaignId,
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
					.leftJoin(votingTransactions, eq(votingCampaigns.id, votingTransactions.votingCampaign))
					.where(eq(votingTransactions.id, id))
			)?.at(0)?.voting_campaigns;
			if (!campaign) return { error: "invalidCampaignID" };

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
				case "random_select":
					return ok({
						campaignType: "random_select",
						...campaign.options,
						group: Object.fromEntries(groupStudents.map((gs) => [gs.id, gs.fullName])),
					});
				case "hungarian":
					return ok({
						campaignType: "hungarian",
						pickAmount: campaign.options.pickAmount,
						total: groupStudents.length,
					});
				case "casino":
					return ok({
						campaignType: "casino",
						availablePoints: campaign.options.availablePoints,
						total: groupStudents.length,
					});
			}
		},
	);
