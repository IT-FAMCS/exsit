import { z } from "zod";

export const createApiSchema = <
	TID extends z.ZodType = z.ZodNull,
	TOD extends z.ZodType = z.ZodNull,
	TOE extends z.ZodEnum<Readonly<Record<string, string>>> = z.ZodEnum<Record<string, never>>,
>(options: {
	request?: TID;
	response?: TOD;
	errors?: TOE;
}) =>
	[
		(options.request ?? z.null()) as TID,
		z.discriminatedUnion("error", [
			z.object({
				error: z.null(),
				data: (options.response ?? z.null()) as TOD,
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
				error: (options.errors ?? z.enum([])) as TOE,
				details: z.unknown().optional(),
			}),
		]),
	] as const;

export type AnyAPIResponseSchema = ReturnType<typeof createApiSchema>[1];
export const ok = <T>(data: T) => ({ error: null, data }) as const;
