import { z } from "zod";
import { FileSchema } from "../baseSchemas.js";

export const DownloadFileParamsSchema = FileSchema.pick({ uuid: true });

export const DownloadFileResponseSchema = z.object({
  url: z.url().describe("Temporary signed URL"),
  expiresAt: z.iso.datetime().describe("When the URL expires"),
});
