import { z } from "zod";

import { IdSchema } from "../../../zod.js";

export const DeleteReductionPlanInitiativeParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the reduction plan initiative to delete"),
});

export const DeleteReductionPlanInitiativeResponseSchema = z.strictObject({});
