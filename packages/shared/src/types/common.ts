import { z } from "zod";

export const FileMetadata = z.object({
	filename: z.string(),
	type: z.string(),
	uploaded: z.date(),
	modified: z.date().nullable(),
	size: z.number(),
});
export type FileMetadataType = z.infer<typeof FileMetadata>;

export const Files = z.record(z.string(), FileMetadata);
export type FilesType = z.infer<typeof Files>;
