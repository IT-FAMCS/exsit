import z from "zod";
import { files } from "../schema/files";
import {
	GetBatchFileMetadataRequest,
	GetBatchFileMetadataResponse,
	GetFileMetadataRequest,
	GetFileMetadataResponse,
} from "@exsit/shared/types/files";
import { db } from "../connection";
import { eq, inArray } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import { v7 } from "uuid";
import { compressBuffer } from "@/utils/compression";

export const fileExists = async (id: string) =>
	!!(await db.select().from(files).where(eq(files.id, id)))?.[0];

export const removeFile = async (id: string) => await db.delete(files).where(eq(files.id, id));

export const getFileMetadata = async (
	req: z.infer<typeof GetFileMetadataRequest>,
): Promise<z.input<typeof GetFileMetadataResponse>> => {
	const meta = (await db.select().from(files).where(eq(files.id, req.file)))?.[0];
	if (!meta) return { error: "notFound" };
	const { data: _, id: __, ...rest } = meta;
	return ok({
		...rest,
		uploaded: rest.uploaded.toISOString(),
		modified: rest.modified ? rest.modified.toISOString() : null,
	});
};

export const getBatchFileMetadata = async (
	req: z.infer<typeof GetBatchFileMetadataRequest>,
): Promise<z.input<typeof GetBatchFileMetadataResponse>> => {
	const metadata = await db.select().from(files).where(inArray(files.id, req.files));
	if (req.files.length !== metadata.length)
		return {
			error: "notFound",
			details: req.files.filter((f) => !metadata.some((m) => f === m.id)),
		};
	return ok(
		Object.fromEntries(
			metadata.map((m) => {
				const { data: _, id, ...rest } = m;
				return [
					id,
					{
						...rest,
						uploaded: rest.uploaded.toISOString(),
						modified: rest.modified ? rest.modified.toISOString() : null,
					},
				];
			}),
		),
	);
};

export const uploadFile = async (file: File): Promise<string | undefined> => {
	try {
		const id = `F-${v7()}`;
		await db.insert(files).values({
			id,
			filename: file.name,
			size: file.size,
			type: file.type,
			uploaded: new Date(),
			data: await compressBuffer(await file.arrayBuffer()),
		});
		return id;
	} catch {
		return undefined;
	}
};
