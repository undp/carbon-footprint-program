import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const RejectRequestParamsSchema = z.object({
  id: IdSchema.describe("The ID of the submission to reject"),
});

export const RejectRequestBodySchema = z.object({
  reviewComments: z.string().optional().describe("Optional reviewer comments"),
});

export const RejectRequestResponseSchema = z.object({
  submissionId: IdSchema.describe("The ID of the rejected submission"),
});
