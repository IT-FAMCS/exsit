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
			error: z.null(),
			data: dataSchema,
		}),

		z.object({
			error: z.literal("internal"),
			details: z.unknown().optional(),
		}),

		z.object({
			error: z.literal("validation"),
			details: z.object().optional(),
		}),

		z.object({
			error: errorSchema,
			details: z.unknown().optional(),
		}),
	]);
export type AnyAPIResponseSchema = ReturnType<typeof createApiResponseSchema>;
export const ok = <T>(data: T) => ({ error: null, data }) as const;
