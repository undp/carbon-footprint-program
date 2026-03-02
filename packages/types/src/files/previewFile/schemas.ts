import { FileBaseSchema } from "../../baseSchemas/index.js";
import { SignedUrlResponseSchema } from "../schemas.js";

export const PreviewFileParamsSchema = FileBaseSchema.pick({ uuid: true });

export const PreviewFileResponseSchema = SignedUrlResponseSchema;
