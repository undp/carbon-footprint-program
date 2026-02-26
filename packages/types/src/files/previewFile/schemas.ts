import { FileSchema, SignedUrlResponseSchema } from "../baseSchemas.js";

export const PreviewFileParamsSchema = FileSchema.pick({ uuid: true });

export const PreviewFileResponseSchema = SignedUrlResponseSchema;
