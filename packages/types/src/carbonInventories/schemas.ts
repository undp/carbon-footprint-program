import { z } from "zod";
import { IdSchema } from "../zod.js";

export const LineFileSummarySchema = z
  .object({
    id: IdSchema.describe("The file ID"),
    uuid: z.uuid().describe("The file UUID"),
    originalName: z.string().describe("The original file name"),
    sizeBytes: z
      .number()
      .int()
      .nonnegative()
      .describe("The file size in bytes"),
  })
  .strict();

export const CarbonInventoryDisplayStatusSchema = z.enum([
  "DRAFT",
  "SELF_DECLARED",
  "SUBMITTED_TO_CALCULATION",
  "CALCULATION_REVIEWED",
  "CALCULATION_REJECTED",
  "CALCULATION_APPROVED",
  "SUBMITTED_TO_VERIFICATION",
  "VERIFICATION_REVIEWED",
  "VERIFICATION_REJECTED",
  "VERIFICATION_APPROVED",
  "DELETED",
]);

export const CarbonInventoryDisplayStatusEnum =
  CarbonInventoryDisplayStatusSchema.enum;
