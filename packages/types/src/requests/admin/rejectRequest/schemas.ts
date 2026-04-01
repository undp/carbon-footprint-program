import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const RejectRequestParamsSchema = z.object({
  id: IdSchema.describe("The ID of the submission to reject"),
});

export const RejectRequestBodySchema = z.object({
  reviewComments: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe("Optional reviewer comments"),
  revisionFileUuids: z
    .array(z.uuid())
    .optional()
    .describe("UUIDs of admin-attached revision files"),
});

export const RejectRequestResponseSchema = z.object({});
