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
import { eq, and, sql } from "drizzle-orm";
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
import { GetAllCampaignVotesResponse } from "@exsit/shared/types/admin";
import schedule from "node-schedule";
import parseDuration from "parse-duration";

export const votingCampaignExists = async (id: string) => !!(await getVotingCampaignById(id));
export const getVotingCampaignById = async (id: string) =>
	(await db.select().from(votingCampaigns).where(eq(votingCampaigns.id, id)))?.at(0);

export const getVotingCampaignStatistics = async (
	campaign: (typeof votingCampaigns)["$inferSelect"],
): Promise<{ started?: string; stopped?: string; voted: number; total: number } | undefined> => {
	const total = await getGroupSize((await getGroupIdByExam(campaign.exam)) ?? "");
	if (total === undefined) return undefined;
	const voted = await getVotingCampaignVotes(campaign.id);
	if (voted.error !== null) return undefined;

	return {
		started: campaign.started?.toISOString(),
		stopped: campaign.stopped?.toISOString(),
		total,
		voted: voted.data.length,
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
		case "poker":
			return { type: "poker" };
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
		.set({ status: "voting_started", started: new Date() })
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

	if (campaign.options.duration) {
		const parsedDuration = parseDuration(campaign.options.duration);
		if (parsedDuration)
			schedule.scheduleJob(new Date(Date.now() + parsedDuration), () =>
				stopVotingCampaign(campaignId),
			);
	}

	await sendVotingCampaignStartedMessage((await getVotingCampaignById(campaignId))!);
	return ok(null);
};

export const setCampaignStatusMessage = async (campaignId: string, statusMessage: number) => {
	const campaign = (await getVotingCampaignById(campaignId))!;
	if (campaign.options.type !== "random_select" || campaign.state.type !== "random_select") return;
	await db
		.update(votingCampaigns)
		.set({
			state: {
				...campaign.state,
				statusMessage,
			} satisfies VotingCampaignStateType,
		})
		.where(eq(votingCampaigns.id, campaign.id));
};

export const stopVotingCampaign = async (
	campaignId: string,
): Promise<z.input<typeof StopVotingCampaignResponse>> => {
	const campaign = await getVotingCampaignById(campaignId);
	if (!campaign) return { error: "invalidCampaignID" };
	if (campaign.status === "voting_ended") return ok(null);

	await db
		.update(votingCampaigns)
		.set({ status: "voting_ended" })
		.where(eq(votingCampaigns.id, campaignId));
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
		const { hooks: _, ...filteredResult } = result.data;
		await db
			.update(votingCampaigns)
			.set({ status: "finished", result: filteredResult })
			.where(eq(votingCampaigns.id, campaignId));
		await sendVotingCampaignResultsMessage(campaign, result.data);
	}
	return result;
};

export const getVotingCampaignVotes = async (
	campaignId: string,
): Promise<z.input<typeof GetAllCampaignVotesResponse>> => {
	const campaign = (await getVotingCampaignById(campaignId))!;
	let rawVotes = await db.select().from(votes).where(eq(votes.campaign, campaign.id));
	if (campaign.state.type === "casino")
		rawVotes = rawVotes.filter(
			(rv) =>
				rv.vote.campaignType === "casino" &&
				rv.vote.round ===
					(campaign.state as Extract<VotingCampaignStateType, { type: "casino" }>).round,
		);
	return ok(
		rawVotes.map((v) => ({
			student: v.student,
			vote: v.vote,
			timestamp: v.timestamp,
		})),
	);
};

export const rescheduleCampaignsWithDurations = async () => {
	const campaigns = await db.select().from(votingCampaigns);
	for (const campaign of campaigns) {
		if (!campaign.options.duration || !campaign.started) continue;
		const parsedDuration = parseDuration(campaign.options.duration);
		if (parsedDuration) {
			const date = new Date(campaign.started.getTime() + parsedDuration);
			if (date.getTime() < Date.now()) continue;

			schedule.scheduleJob(date, () => stopVotingCampaign(campaign.id));
			console.log(`rescheduled campaign ${campaign.id} for ${date}`);
		}
	}
};
