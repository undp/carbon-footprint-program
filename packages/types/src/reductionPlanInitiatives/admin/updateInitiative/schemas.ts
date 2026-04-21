import { z } from "zod";

import { IdSchema } from "../../../zod.js";
import { InitiativeMutationDataSchema } from "../schemas.js";

export const UpdateInitiativeParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the initiative to update"),
  })
  .strict();

export const UpdateInitiativeRequestSchema =
  InitiativeMutationDataSchema.partial().refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    {
      message: "At least one field must be provided with a defined value",
    }
  );

export const UpdateInitiativeResponseSchema = z.strictObject({});
