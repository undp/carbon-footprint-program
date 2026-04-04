import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const RequestReductionProjectVerificationParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const RequestReductionProjectVerificationBodySchema = z
  .object({
    fileUuids: z
      .array(z.uuid())
      .optional()
      .describe("UUIDs of pre-uploaded files to attach"),
  })
  .nullish();

export const RequestReductionProjectVerificationResponseSchema = z
  .null()
  .describe("Submission created successfully");
