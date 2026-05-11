import * as z from "zod";
import type { ValidationTargets } from "hono";
import { zValidator as zv } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { AnyAPIResponseSchema } from "@exsit/shared/types/api";
import { createMiddleware } from "hono/factory";

export const zValidator = <T extends z.ZodSchema, Target extends keyof ValidationTargets>(
	target: Target,
	schema: T,
) =>
	zv(target, schema, (result) => {
		if (!result.success) {
			throw new HTTPException(400, {
				cause: result.error,
				res: new Response(
					JSON.stringify({
						error: "validation",
						details: z.treeifyError(result.error),
					} satisfies z.infer<AnyAPIResponseSchema>),
				),
			});
		}
	});

export const requireExisting = (
	param: string,
	error: string,
	checker: (value: string) => Promise<boolean>,
) =>
	createMiddleware(async (c, next) => {
		const value = c.req.param(param) as string | undefined;
		if (!value || !(await checker(value))) return c.json({ error }, 400);
		await next();
		return;
	});
