import { FileSchema, SignedUrlResponseSchema } from "../baseSchemas.js";

export const DownloadFileParamsSchema = FileSchema.pick({ uuid: true });

export const DownloadFileResponseSchema = SignedUrlResponseSchema;
