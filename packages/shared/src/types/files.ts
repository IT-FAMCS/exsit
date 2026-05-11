import { z } from "zod";
import { createApiSchema } from "./api";

export const FileMetadata = z.object({
	filename: z.string(),
	type: z.string(),
	uploaded: z.coerce.date<string>(),
	modified: z.coerce.date<string>().nullable(),
	size: z.number(),
});
export type FileMetadataType = z.infer<typeof FileMetadata>;

export const Files = z.record(z.string(), FileMetadata);
export type FilesType = z.infer<typeof Files>;

export const [, GetFileResponse] = createApiSchema({
	errors: z.enum(["notFound"]),
});

export const [GetFileMetadataRequest, GetFileMetadataResponse] = createApiSchema({
	request: z.object({ file: z.string() }),
	response: FileMetadata,
	errors: z.enum(["notFound"]),
});

export const [GetBatchFileMetadataRequest, GetBatchFileMetadataResponse] = createApiSchema({
	request: z.object({ files: z.array(z.string()) }),
	response: Files,
	errors: z.enum(["notFound"]),
});
