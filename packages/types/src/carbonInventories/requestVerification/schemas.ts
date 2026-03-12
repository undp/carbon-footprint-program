import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const RequestVerificationParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const RequestVerificationBodySchema = z
  .object({
    fileUuids: z
      .array(z.uuid())
      .optional()
      .describe("UUIDs of pre-uploaded files to attach"),
  })
  .nullish();

export const RequestVerificationResponseSchema = z
  .null()
  .describe("Verification request created successfully");
