import { getTransactionInformation, votingTransactionExists } from "@/db/actions/transactions";
import { requireExisting } from "@/utils/hono";
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
	);
