import { z } from "zod";
import { FileSchema } from "../baseSchemas.js";

export const PreviewFileParamsSchema = FileSchema.pick({ uuid: true });

export const PreviewFileResponseSchema = z.object({
  url: z.url().describe("Temporary signed URL"),
  expiresAt: z.iso.datetime().describe("When the URL expires"),
});
