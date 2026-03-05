import { FileBaseSchema } from "../../baseSchemas/index.js";
import { SignedUrlResponseSchema } from "../schemas.js";

export const DownloadFileParamsSchema = FileBaseSchema.pick({ uuid: true });

export const DownloadFileResponseSchema = SignedUrlResponseSchema;
