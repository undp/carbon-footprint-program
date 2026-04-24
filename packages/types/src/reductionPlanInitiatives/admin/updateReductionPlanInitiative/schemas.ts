import { z } from "zod";

import { IdSchema } from "../../../zod.js";
import { ReductionPlanInitiativeMutationDataSchema } from "../schemas.js";

export const UpdateReductionPlanInitiativeParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the reduction plan initiative to update"),
  })
  .strict();

export const UpdateReductionPlanInitiativeRequestSchema =
  ReductionPlanInitiativeMutationDataSchema.partial().refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    {
      message: "At least one field must be provided with a defined value",
    }
  );

export const UpdateReductionPlanInitiativeResponseSchema = z.strictObject({});
