import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const ApproveRequestParamsSchema = z.object({
  id: IdSchema.describe("The ID of the submission to approve"),
});

export const ApproveRequestBodySchema = z.object({
  reviewComments: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .optional()
    .describe("Optional reviewer comments"),
  revisionFileUuids: z
    .array(z.uuid())
    .optional()
    .describe("UUIDs of admin-attached revision files"),
  recognitionFileUuids: z
    .array(z.uuid())
    .optional()
    .describe("UUIDs of recognition certificate files"),
});

export const ApproveRequestResponseSchema = z.object({});
