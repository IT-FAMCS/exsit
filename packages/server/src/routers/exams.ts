import {
	campaignExists,
	createVotingCampaign,
	examExists,
	getPreparationMaterials,
	getVotingCampaigns,
	removePreparationMaterial,
	removeVotingCampaign,
	startVotingCampaign,
	uploadPreparationMaterial,
} from "@/db/actions/exams";
import { requireExisting, zValidator } from "@/utils/hono";
import {
	CreateVotingCampaignRequest,
	GetPreparationMaterialsRequest,
	RemovePreparationMaterialRequest,
	UploadPreparationMaterialRequest,
} from "@exsit/shared/types/exams";
import { Hono } from "hono";
import { requireAdminPermissions } from "./auth";
import { except } from "hono/combine";

const requireExistingExam = requireExisting("id", "invalidExamID", examExists);
const requireExistingCampaign = requireExisting("campaign", "invalidCampaignID", campaignExists);

export const examRouter = new Hono()
	.use("*", except(["/exams/:id/materials", "/exams/:id/campaigns"], requireAdminPermissions))
	.use("/:id/*", requireExistingExam)
	.use("/:id/campaigns/:campaign/*", requireExistingCampaign)

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
	)
	.patch("/:id/campaigns/:campaign/start", async (c) =>
		c.json(await startVotingCampaign(c.req.param("campaign"))),
	)
	.delete("/:id/campaigns/:campaign/remove", async (c) =>
		c.json(await removeVotingCampaign(c.req.param("campaign"))),
	);
