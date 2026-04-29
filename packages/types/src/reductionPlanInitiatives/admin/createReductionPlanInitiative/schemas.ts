import { z } from "zod";

import { IdSchema } from "../../../zod.js";
import { ReductionPlanInitiativeMutationDataSchema } from "../schemas.js";

export const CreateReductionPlanInitiativeRequestSchema =
  ReductionPlanInitiativeMutationDataSchema;

export const CreateReductionPlanInitiativeResponseSchema = z.strictObject({
  id: IdSchema.describe("The ID of the created reduction plan initiative"),
});
