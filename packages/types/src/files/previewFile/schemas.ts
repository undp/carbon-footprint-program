import { z } from "zod";

export const SasUrlResponseSchema = z.object({
  url: z.string().url().describe("Temporary signed URL"),
  expiresAt: z.iso.datetime().describe("When the URL expires"),
});
