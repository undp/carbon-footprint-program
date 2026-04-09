import { z } from "zod";
import { IdSchema } from "../../zod.js";
<<<<<<< feat/add-view-submission-history-dialog
import { GetSubmissionHistoryResponseSchema } from "../submissionHistory/schemas.js";
=======
>>>>>>> main

export const GetCarbonInventoryHistoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});
<<<<<<< feat/add-view-submission-history-dialog

export const GetCarbonInventoryHistoryResponseSchema =
  GetSubmissionHistoryResponseSchema;
=======
>>>>>>> main
