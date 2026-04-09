import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { GetSubmissionHistoryResponseSchema } from "../submissionHistory/schemas.js";

export const GetCarbonInventoryHistoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetCarbonInventoryHistoryResponseSchema =
  GetSubmissionHistoryResponseSchema;
