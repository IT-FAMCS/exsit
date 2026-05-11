import { getFile, getFileMetadata } from "@/db/actions/files";
import { Hono } from "hono";
import contentDisposition from "content-disposition";
import { decompressBuffer } from "@/utils/compression";

export const fileRouter = new Hono()
	.get("/:file", async (c) => {
		const file = await getFile(c.req.param("file"));
		if (!file) return c.json({ error: "notFound" });

		c.header("Content-Type", file.type);
		c.header("Content-Disposition", contentDisposition(file.filename));
		return c.body(Buffer.from(await decompressBuffer(file.data)));
	})
	.get("/:file/meta", async (c) => c.json(await getFileMetadata({ file: c.req.param("file") })));
