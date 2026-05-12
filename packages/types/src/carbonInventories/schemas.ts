import { z } from "zod";
import { IdSchema } from "../zod.js";

export const LineFileOriginalNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (name) => !/\p{Cc}/u.test(name),
    "File name must not contain control characters"
  )
  .refine(
    (name) => !/[/\\]/.test(name),
    "File name must not contain path separators"
  )
  .describe("The original file name");

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
