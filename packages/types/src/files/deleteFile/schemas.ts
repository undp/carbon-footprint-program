import { FileSchema } from "../baseSchemas.js";

export const DeleteFileParamsSchema = FileSchema.pick({ uuid: true });

export const DeleteFileResponseSchema = FileSchema;
