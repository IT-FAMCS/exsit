import { ok } from "@exsit/shared/types/api";
import {
	GetVotingCampaignsResponse,
	CreateVotingCampaignRequest,
	CreateVotingCampaignResponse,
	RemoveVotingCampaignResponse,
} from "@exsit/shared/types/exams";
import { eq, and, sql } from "drizzle-orm";
import z from "zod";
import { db } from "../connection";
import { votingCampaigns } from "../schema/exams";
import { ulid } from "ulid";

export const campaignExists = async (id: string) => !!(await getCampaignById(id));
export const getCampaignById = async (id: string) =>
	(await db.select().from(votingCampaigns).where(eq(votingCampaigns.id, id)))?.[0];

export const getVotingCampaigns = async (
	exam: string,
): Promise<z.input<typeof GetVotingCampaignsResponse>> => {
	const campaigns = await db.select().from(votingCampaigns).where(eq(votingCampaigns.exam, exam));
	return ok(
		Object.fromEntries(campaigns.map((c) => [c.id, { options: c.options, state: c.state }])),
	);
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
		state: "created",
		options: req,
	});
	return ok(id);
};

export const removeVotingCampaign = async (
	campaign: string,
): Promise<z.input<typeof RemoveVotingCampaignResponse>> => {
	await db.delete(votingCampaigns).where(eq(votingCampaigns.id, campaign));
	return ok(null);
};

export const startVotingCampaign = async (
	campaign: string,
): Promise<z.input<typeof RemoveVotingCampaignResponse>> => {
	await db
		.update(votingCampaigns)
		.set({ state: "voting_started" })
		.where(eq(votingCampaigns.id, campaign));
	return ok(null);
};
