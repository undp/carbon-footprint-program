import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubmissionStatus } from "../../../enums.js";

export const SubmitAccreditationRequestParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const SubmissionStatusSchema = z.enum(SubmissionStatus);

export const SubmitAccreditationRequestResponseSchema = z.object({
  id: IdSchema.describe("The submission ID"),
  status: SubmissionStatusSchema.describe("The submission status"),
});
