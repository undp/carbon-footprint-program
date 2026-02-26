import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const ApproveRequestParamsSchema = z.object({
  id: IdSchema.describe("The ID of the submission to approve"),
});

export const ApproveRequestBodySchema = z.object({
  reviewComments: z.string().optional().describe("Optional reviewer comments"),
});

export const ApproveRequestResponseSchema = z.object({
  submissionId: IdSchema.describe("The ID of the approved submission"),
});
