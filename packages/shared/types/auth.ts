import { createApiResponseSchema } from "./api";
import { z } from "zod";

export const VerifyGroupCodeResponse = createApiResponseSchema(
	z.object({
		students: z.record(z.string(), z.string()),
	}),
	z.enum(["invalidGroupCode"]),
);

export const LoginResponse = createApiResponseSchema(z.undefined(), z.enum(["invalidCredentials"]));
