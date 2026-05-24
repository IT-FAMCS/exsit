import { ok } from "@exsit/shared/types/api";
import {
	GetVotingCampaignsResponse,
	CreateVotingCampaignRequest,
	CreateVotingCampaignResponse,
	RemoveVotingCampaignResponse,
	SUPPORTED_CAMPAIGN_TYPES,
	VotingCampaignStateType,
	StartVotingCampaignResponse,
	StopVotingCampaignResponse,
	CalculateVotingCampaignResultsResponse,
} from "@exsit/shared/types/exams";
import { eq, and, sql, count } from "drizzle-orm";
import z from "zod";
import { db } from "../connection";
import { votes, votingCampaigns } from "../schema/exams";
import { ulid } from "ulid";
import { getGroupIdByExam, getGroupSize, getGroupStudents } from "./groups";
import { shuffleArray } from "@/utils/math";
import {
	sendVotingCampaignResultsMessage,
	sendVotingCampaignStartedMessage,
	sendVotingCampaignStoppedMessage,
} from "@/bot";
import { VOTING_CAMPAIGN_CALCULATORS } from "./calculators/shared";

export const votingCampaignExists = async (id: string) => !!(await getVotingCampaignById(id));
export const getVotingCampaignById = async (id: string) =>
	(await db.select().from(votingCampaigns).where(eq(votingCampaigns.id, id)))?.at(0);

export const getVotingCampaignStatistics = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
): Promise<{ started?: string; stopped?: string; voted: number; total: number } | undefined> => {
	const total = await getGroupSize((await getGroupIdByExam(campaign.exam)) ?? "");
	if (total === undefined) return undefined;

	const voted = (
		await db.select({ count: count() }).from(votes).where(eq(votes.campaign, campaign.id))
	)?.at(0)?.count;
	if (voted === undefined) return undefined;

	return {
		started: campaign.started?.toISOString(),
		stopped: campaign.stopped?.toISOString(),
		total,
		voted,
	};
};

export const getVotingCampaigns = async (
	exam: string,
): Promise<z.input<typeof GetVotingCampaignsResponse>> => {
	const campaigns = await db.select().from(votingCampaigns).where(eq(votingCampaigns.exam, exam));
	const statistics = await Promise.all(campaigns.map(getVotingCampaignStatistics));
	if (statistics.some((s) => s === undefined)) return { error: "failedToGetStatistics" };
	return ok(
		Object.fromEntries(
			campaigns.map((c, idx) => [
				c.id,
				{ options: c.options, status: c.status, ...statistics[idx]! },
			]),
		),
	);
};

const getInitialState = (
	type: (typeof SUPPORTED_CAMPAIGN_TYPES)[number],
): VotingCampaignStateType => {
	switch (type) {
		case "random_select":
			return { type: "random_select", current: 0, order: [] };
		case "hungarian":
			return { type: "hungarian" };
		case "casino":
			return { type: "casino", distribution: {}, round: 1 };
		case "ttc":
			return { type: "ttc", seats: {}, state: "select" };
	}
};

export const createVotingCampaign = async (
	exam: string,
	req: z.infer<typeof CreateVotingCampaignRequest>,
): Promise<z.input<typeof CreateVotingCampaignResponse>> => {
	const exists = !!(
		await db
			.select()
			.from(votingCampaigns)
			.where(
				and(
					eq(sql`${votingCampaigns.options}->>'$.type'`, req.type),
					eq(votingCampaigns.exam, exam),
				),
			)
	)?.[0];
	if (exists) return { error: "alreadyExists" };
	const id = `VC-${ulid()}`;
	await db.insert(votingCampaigns).values({
		id,
		exam,
		status: "created",
		options: req,
		state: getInitialState(req.type),
	});
	return ok(id);
};

export const removeVotingCampaign = async (
	campaignId: string,
): Promise<z.input<typeof RemoveVotingCampaignResponse>> => {
	await db.delete(votingCampaigns).where(eq(votingCampaigns.id, campaignId));
	return ok(null);
};

export const startVotingCampaign = async (
	campaignId: string,
): Promise<z.input<typeof StartVotingCampaignResponse>> => {
	await db
		.update(votingCampaigns)
		.set({ status: "voting_started" })
		.where(eq(votingCampaigns.id, campaignId));

	const campaign = (await getVotingCampaignById(campaignId))!;
	const group = (await getGroupIdByExam(campaign.exam))!;

	if (campaign.options.type === "random_select") {
		const groupSize = await getGroupSize(group);
		if (!groupSize) return { error: "invalidGroupCode" };
		const order = shuffleArray(Array.from({ length: groupSize }, (_, i) => i));
		await db
			.update(votingCampaigns)
			.set({
				state: {
					type: "random_select",
					current: 0,
					order,
				} satisfies VotingCampaignStateType,
			})
			.where(eq(votingCampaigns.id, campaign.id));
	}

	await sendVotingCampaignStartedMessage(campaign);
	return ok(null);
};

export const stopVotingCampaign = async (
	campaignId: string,
): Promise<z.input<typeof StopVotingCampaignResponse>> => {
	await db
		.update(votingCampaigns)
		.set({ status: "voting_ended" })
		.where(eq(votingCampaigns.id, campaignId));

	const campaign = (await getVotingCampaignById(campaignId))!;
	await sendVotingCampaignStoppedMessage(campaign);
	return ok(null);
};

export const calculateVotingCampaignResults = async (
	campaignId: string,
): Promise<z.input<typeof CalculateVotingCampaignResultsResponse>> => {
	const campaign = (await getVotingCampaignById(campaignId))!;
	if (campaign.status !== "voting_ended") return { error: "votingNotEnded" };
	const group = await getGroupStudents((await getGroupIdByExam(campaign.exam)) ?? "");
	if (!group) return { error: "invalidGroupCode" };

	const rawVotes = await db.select().from(votes).where(eq(votes.campaign, campaign.id));
	const mappedVotes = Object.fromEntries(rawVotes.map((obj) => [obj.student, obj.vote]));
	const timestamps = Object.fromEntries(rawVotes.map((obj) => [obj.student, obj.timestamp]));

	const result = await VOTING_CAMPAIGN_CALCULATORS[campaign.options.type]({
		campaign,
		group,
		timestamps,
		votes: mappedVotes,
	});
	if (result.error === null) {
		await db
			.update(votingCampaigns)
			.set({ status: "finished", result: result.data })
			.where(eq(votingCampaigns.id, campaignId));
		await sendVotingCampaignResultsMessage({ ...campaign, result: result.data });
	}
	return result;
};
