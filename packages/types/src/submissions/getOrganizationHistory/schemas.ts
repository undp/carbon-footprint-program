import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { GetSubmissionHistoryResponseSchema } from "../submissionHistory/schemas.js";

export const GetOrganizationHistoryParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const GetOrganizationHistoryResponseSchema =
  GetSubmissionHistoryResponseSchema;
