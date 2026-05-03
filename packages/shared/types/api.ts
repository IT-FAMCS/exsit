import { z } from "zod";

export const createApiResponseSchema = <
	TO extends z.ZodType,
	TE extends z.ZodEnum<Readonly<Record<string, string>>>,
>(
	dataSchema: TO,
	errorSchema: TE,
) =>
	z.discriminatedUnion("error", [
		z.object({
			error: z.undefined().optional(),
			data: dataSchema,
		}),

		z.object({
			error: z.literal("validation"),
			details: z.instanceof(z.ZodError),
		}),

		z.object({
			error: errorSchema,
			details: z.unknown().optional(),
		}),
	]);
export type AnyAPIResponseSchema = ReturnType<typeof createApiResponseSchema>;
