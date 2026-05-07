import { z } from "zod";

export const GetCurrentTermsConditionsResponseSchema = z.object({
  fileName: z
    .string()
    .nullable()
    .describe(
      "The original file name of the current Terms & Conditions PDF, or null when no T&C has been published yet. The PDF itself is served by GET /api/terms-conditions/file."
    ),
});
