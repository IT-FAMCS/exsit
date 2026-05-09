import {
	MATERIALS_TAGS,
	CreateExamRequest,
	CreateExamResponse,
	CreateVotingCampaignRequest,
	CreateVotingCampaignResponse,
	GetPreparationMaterialsResponse,
	GetVotingCampaignsResponse,
	RemovePreparationMaterialRequest,
	RemovePreparationMaterialResponse,
	RemoveVotingCampaignResponse,
	UploadPreparationMaterialRequest,
	UploadPreparationMaterialResponse,
} from "@exsit/shared/types/exams";
import z from "zod";
import { db } from "../connection";
import { exams, preparationMaterials, votingCampaigns } from "../schema/exams";
import { v7 } from "uuid";
import { eq, and } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import { eqOrNull } from "@/utils/db";
import { fileExists, getBatchFileMetadata, removeFile, uploadFile } from "./files";

export const createExam = async (
	group: string,
	req: z.infer<typeof CreateExamRequest>,
): Promise<z.input<typeof CreateExamResponse>> => {
	const id = v7();
	await db.insert(exams).values({
		id,
		group,
		...req,
	});
	return ok(id);
};

export type DatabaseExam = (typeof exams)["$inferSelect"];
export const getExamById = async (id: string): Promise<DatabaseExam | undefined> =>
	(await db.select().from(exams).where(eq(exams.id, id)))?.[0];
export const examExists = async (id: string) => !!(await getExamById(id));

export const getPreparationMaterials = async (
	exam: string,
	tag?: (typeof MATERIALS_TAGS)[number],
): Promise<z.input<typeof GetPreparationMaterialsResponse>> => {
	const ids = (
		await db
			.select()
			.from(preparationMaterials)
			.where(
				and(eq(preparationMaterials.exam, exam), eqOrNull(preparationMaterials.tag, tag ?? null)),
			)
	).map((m) => m.file);
	const metadata = await getBatchFileMetadata({ files: ids });
	if (metadata.error) return { error: "missingFileMetadata", details: metadata.details };
	return ok(metadata.data);
};

export const uploadPreparationMaterial = async (
	exam: string,
	req: z.infer<typeof UploadPreparationMaterialRequest>,
): Promise<z.input<typeof UploadPreparationMaterialResponse>> => {
	const file = await uploadFile(req.file);
	if (!file) return { error: "fileUploadFailed" };
	await db.insert(preparationMaterials).values({
		file,
		exam,
		tag: req.tag,
	});
	return ok(file);
};

export const removePreparationMaterial = async (
	exam: string,
	req: z.infer<typeof RemovePreparationMaterialRequest>,
): Promise<z.input<typeof RemovePreparationMaterialResponse>> => {
	if (!(await fileExists(req.id))) return { error: "invalidFileID" };
	await db
		.delete(preparationMaterials)
		.where(and(eq(preparationMaterials.exam, exam), eq(preparationMaterials.file, req.id)));
	await removeFile(req.id);
	return ok(null);
};

export const campaignExists = async (id: string) =>
	!!(await db.select().from(votingCampaigns).where(eq(votingCampaigns.id, id)))?.[0];

export const getVotingCampaigns = async (
	exam: string,
): Promise<z.input<typeof GetVotingCampaignsResponse>> => {
	const campaigns = await db.select().from(votingCampaigns).where(eq(votingCampaigns.exam, exam));
	return ok(Object.fromEntries(campaigns.map((c) => [c.id, { type: c.type, state: c.state }])));
};

export const createVotingCampaign = async (
	exam: string,
	req: z.infer<typeof CreateVotingCampaignRequest>,
): Promise<z.input<typeof CreateVotingCampaignResponse>> => {
	const exists = !!(
		await db
			.select()
			.from(votingCampaigns)
			.where(and(eq(votingCampaigns.type, req.type), eq(votingCampaigns.exam, exam)))
	)?.[0];
	if (exists) return { error: "alreadyExists" };
	const id = v7();
	await db.insert(votingCampaigns).values({
		id,
		exam,
		type: req.type,
		state: "created",
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
