import {
	castVote,
	getTransactionInformation,
	votingTransactionExists,
} from "@/db/actions/transactions";
import { requireExisting, zValidator } from "@/utils/hono";
import { CastVoteRequest } from "@exsit/shared/types/exams";
import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";

const requireExistingTransaction = requireExisting(
	"transaction",
	"invalidTransactionID",
	votingTransactionExists,
);

export const votingRouter = new Hono<{ Variables: JwtVariables }>()
	.use("/:transaction/*", requireExistingTransaction)
	.get("/:transaction/info", async (c) =>
		c.json(await getTransactionInformation(c.req.param("transaction"))),
	)
	.post("/:transaction/cast", zValidator("json", CastVoteRequest), async (c) =>
		c.json(await castVote(c.req.param("transaction"), c.req.valid("json"))),
	);
