import z from "zod";
import { getGroupByStudentId } from "./groups";
import { RequestVotingTransactionResponse } from "@exsit/shared/types/exams";
import { ulid } from "ulid";
import { db } from "../connection";
import { votingTransactions } from "../schema/exams";
import { ok } from "@exsit/shared/types/api";
import { ExsitJwtPayload } from "@/routers/auth";
import { getCampaignById } from "./campaigns";

export const createVotingTransaction = async (
	payload: ExsitJwtPayload,
	campaignId: string,
): Promise<z.input<typeof RequestVotingTransactionResponse>> => {
	if (payload.role === "admin") return { error: "adminsCannotVote" };
	const group = getGroupByStudentId(payload.id);
	if (!group) return { error: "invalidGroupCode" };

	const campaign = await getCampaignById(campaignId);
	if (!campaign) return { error: "invalidCampaignID" };
	if (campaign.state === "created") return { error: "campaignNotStarted" };
	else if (campaign.state === "voting_ended" || campaign.state === "finished")
		return { error: "campaignStopped" };

	const id = `VT-${ulid()}`;
	await db.insert(votingTransactions).values({
		id,
		student: payload.id,
		votingCampaign: campaignId,
	});
	return ok(id);
};
