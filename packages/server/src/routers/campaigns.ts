import { startVotingCampaign, removeVotingCampaign, votingCampaignExists } from "@/db/actions/campaigns";
import { requireExisting } from "@/utils/hono";
import { Hono } from "hono";
import { ExsitJwtPayload, requireAdminPermissions } from "./auth";
import { except } from "hono/combine";
import { JwtVariables } from "hono/jwt";
import { createVotingTransaction } from "@/db/actions/transactions";

const requireExistingCampaign = requireExisting("campaign", "invalidCampaignID", votingCampaignExists);

export const campaignsRouter = new Hono<{ Variables: JwtVariables }>()
	.use("/:campaign/*", requireExistingCampaign)
	.use("*", except("/campaigns/:campaign/transaction", requireAdminPermissions))

	.get("/:campaign/transaction", async (c) =>
		c.json(
			await createVotingTransaction(
				c.get("jwtPayload") as ExsitJwtPayload,
				c.req.param("campaign"),
			),
		),
	)
	.patch("/:campaign/start", async (c) =>
		c.json(await startVotingCampaign(c.req.param("campaign"))),
	)
	.delete("/:campaign/remove", async (c) =>
		c.json(await removeVotingCampaign(c.req.param("campaign"))),
	);
