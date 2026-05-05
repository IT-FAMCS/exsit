import { createApiResponseSchema } from "./api";
import { z } from "zod";

export const VerifyGroupCodeResponse = createApiResponseSchema(
	z.object({
		students: z.record(z.string(), z.string()),
	}),
	z.enum(["invalidGroupCode"]),
);

export const LoginResponse = createApiResponseSchema(
	z.null(),
	z.enum(["invalidCredentials", "invalidGroupCode"]),
);

export const LoginRequest = z.object({
	groupCode: z.string().optional(),
	id: z.string(),
	password: z.string(),
});
