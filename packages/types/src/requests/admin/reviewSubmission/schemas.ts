import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const ReviewSubmissionParamsSchema = z.object({
  id: IdSchema.describe("The ID of the submission to review"),
});

export const ReviewSubmissionBodySchema = z.object({
  reviewComments: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe("Required reviewer comments"),
  reviewFileUuids: z
    .array(z.uuid())
    .optional()
    .describe("UUIDs of admin-attached review files"),
});

export const ReviewSubmissionResponseSchema = z.object({});
