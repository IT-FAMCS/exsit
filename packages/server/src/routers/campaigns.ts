import { startVotingCampaign, removeVotingCampaign, campaignExists } from "@/db/actions/campaigns";
import { requireExisting } from "@/utils/hono";
import { Hono } from "hono";
import { ExsitJwtPayload, requireAdminPermissions } from "./auth";
import { except } from "hono/combine";
import { JwtVariables } from "hono/jwt";
import { createVotingTransaction } from "@/db/actions/transactions";
import { setCookie } from "hono/cookie";

const requireExistingCampaign = requireExisting("campaign", "invalidCampaignID", campaignExists);

export const campaignsRouter = new Hono<{ Variables: JwtVariables }>()
	.use("/:campaign/*", requireExistingCampaign)
	.use("*", except("/campaigns/:campaign/transaction", requireAdminPermissions))

	.get("/:campaign/transaction", async (c) => {
		const payload = c.get("jwtPayload") as ExsitJwtPayload;
		const result = await createVotingTransaction(payload, c.req.param("campaign"));
		if (result.error === null) {
			setCookie(c, "exsittransaction", result.data, {
				httpOnly: true,
				maxAge: 3600,
				domain: process.env.HOSTNAME,
				sameSite: "lax",
				secure: true,
			});
		}
		return c.json(result);
	})
	.patch("/:campaign/start", async (c) =>
		c.json(await startVotingCampaign(c.req.param("campaign"))),
	)
	.delete("/:campaign/remove", async (c) =>
		c.json(await removeVotingCampaign(c.req.param("campaign"))),
	);
