import {
	examExists,
	getExamById,
	getPreparationMaterials,
	removePreparationMaterial,
	uploadPreparationMaterial,
} from "@/db/actions/exams";
import { requireExisting, zValidator } from "@/utils/hono";
import {
	CreateVotingCampaignRequest,
	GetPreparationMaterialsRequest,
	GetSpecificExamResponse,
	RemovePreparationMaterialRequest,
	UploadPreparationMaterialRequest,
} from "@exsit/shared/types/exams";
import { Hono } from "hono";
import { requireAdminPermissions } from "./auth";
import { except } from "hono/combine";
import { JwtVariables } from "hono/jwt";
import { ok } from "@exsit/shared/types/api";
import z from "zod";
import { getVotingCampaigns, createVotingCampaign } from "@/db/actions/campaigns";

const requireExistingExam = requireExisting("id", "invalidExamID", examExists);

export const examRouter = new Hono<{ Variables: JwtVariables }>()
	.use(
		"*",
		except(
			["/exams", "/exams/:id", "/exams/:id/materials", "/exams/:id/campaigns"],
			requireAdminPermissions,
		),
	)
	.use("/:id/*", requireExistingExam)

	.get("/:id", async (c) => {
		const exam = (await getExamById(c.req.param("id")))!;
		return c.json(
			ok({ ...exam, date: exam.date ? exam.date.toISOString() : null }) satisfies z.input<
				typeof GetSpecificExamResponse
			>,
		);
	})
	.get("/:id/materials", zValidator("query", GetPreparationMaterialsRequest), async (c) =>
		c.json(await getPreparationMaterials(c.req.param("id"), c.req.valid("query").tag)),
	)
	.post("/:id/materials/upload", zValidator("form", UploadPreparationMaterialRequest), async (c) =>
		c.json(await uploadPreparationMaterial(c.req.param("id"), c.req.valid("form"))),
	)
	.delete(
		"/:id/materials/remove",
		zValidator("query", RemovePreparationMaterialRequest),
		async (c) => c.json(await removePreparationMaterial(c.req.param("id"), c.req.valid("query"))),
	)

	.get("/:id/campaigns", async (c) => c.json(await getVotingCampaigns(c.req.param("id"))))
	.post("/:id/create-campaign", zValidator("query", CreateVotingCampaignRequest), async (c) =>
		c.json(await createVotingCampaign(c.req.param("id"), c.req.valid("query"))),
	);
