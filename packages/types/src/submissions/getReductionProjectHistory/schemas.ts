import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { GetSubmissionHistoryResponseSchema } from "../submissionHistory/schemas.js";

export const GetReductionProjectHistoryParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const GetReductionProjectHistoryResponseSchema =
  GetSubmissionHistoryResponseSchema;
