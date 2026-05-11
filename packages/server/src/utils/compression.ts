import { promisify } from "node:util";
import { zstdCompress, zstdDecompress } from "node:zlib";

export const compressBuffer = promisify(zstdCompress);
export const decompressBuffer = promisify(zstdDecompress);
