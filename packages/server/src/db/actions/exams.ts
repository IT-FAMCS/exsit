import {
	MATERIALS_TAGS,
	CreateExamRequest,
	CreateExamResponse,
	GetPreparationMaterialsResponse,
	RemovePreparationMaterialRequest,
	RemovePreparationMaterialResponse,
	UploadPreparationMaterialRequest,
	UploadPreparationMaterialResponse,
	GetExamsResponse,
	PreparationMaterial,
} from "@exsit/shared/types/exams";
import z from "zod";
import { db } from "../connection";
import { exams, preparationMaterials } from "../schema/exams";
import { ulid } from "ulid";
import { eq, and } from "drizzle-orm";
import { ok } from "@exsit/shared/types/api";
import { eqOrNull } from "@/utils/db";
import { fileExists, getBatchFileMetadata, removeFile, uploadFile } from "./files";

export const getExams = async (group: string): Promise<z.input<typeof GetExamsResponse>> => {
	const rawExams = await db.select().from(exams).where(eq(exams.group, group));
	return ok(
		Object.fromEntries(
			rawExams.map((re) => {
				const { id, date, ...rest } = re;
				return [id, { ...rest, date: date ? date.toISOString() : null }];
			}),
		),
	);
};

export const createExam = async (
	group: string,
	req: z.infer<typeof CreateExamRequest>,
): Promise<z.input<typeof CreateExamResponse>> => {
	const id = `E-${ulid()}`;
	await db.insert(exams).values({
		id,
		group,
		...req,
	});
	return ok(id);
};

export type DatabaseExam = (typeof exams)["$inferSelect"];
export const getExamById = async (id: string): Promise<DatabaseExam | undefined> =>
	(await db.select().from(exams).where(eq(exams.id, id)))?.[0];
export const examExists = async (id: string) => !!(await getExamById(id));

export const getPreparationMaterials = async (
	exam: string,
	tag?: (typeof MATERIALS_TAGS)[number],
): Promise<z.input<typeof GetPreparationMaterialsResponse>> => {
	const values = await db
		.select()
		.from(preparationMaterials)
		.where(
			and(eq(preparationMaterials.exam, exam), eqOrNull(preparationMaterials.tag, tag ?? null)),
		);

	const links = values
		.filter((v) => v.type === "link")
		.map(
			(v) =>
				({ type: "link", tag: v.tag ?? undefined, link: v.value }) satisfies z.input<
					typeof PreparationMaterial
				>,
		);

	const rawMetadata = await getBatchFileMetadata({
		files: values.filter((v) => v.type === "file").map((v) => v.value),
	});
	if (rawMetadata.error) return { error: "missingFileMetadata", details: rawMetadata.details };

	const files = Object.entries(rawMetadata.data).map(
		(kv) =>
			({
				type: "file",
				meta: kv[1],
				id: kv[0],
				tag: values.find((v) => v.value === kv[0])?.tag ?? undefined,
			}) satisfies z.input<typeof PreparationMaterial>,
	);

	return ok([...links, ...files]);
};

export const uploadPreparationMaterial = async (
	exam: string,
	req: z.infer<typeof UploadPreparationMaterialRequest>,
): Promise<z.input<typeof UploadPreparationMaterialResponse>> => {
	if (req.type === "file") {
		const file = await uploadFile(req.file);
		if (!file) return { error: "fileUploadFailed" };
		await db.insert(preparationMaterials).values({
			value: file,
			exam,
			tag: req.tag,
			type: "file",
		});
		return ok(null);
	} else {
		await db.insert(preparationMaterials).values({
			value: req.link,
			exam,
			tag: req.tag,
			type: "link",
		});
		return ok(null);
	}
};

export const removePreparationMaterial = async (
	exam: string,
	req: z.infer<typeof RemovePreparationMaterialRequest>,
): Promise<z.input<typeof RemovePreparationMaterialResponse>> => {
	if (!(await fileExists(req.id))) return { error: "invalidFileID" };
	await db
		.delete(preparationMaterials)
		.where(and(eq(preparationMaterials.exam, exam), eq(preparationMaterials.value, req.id)));
	await removeFile(req.id);
	return ok(null);
};