import { z } from "zod";

import { IdSchema } from "../../../zod.js";
import { InitiativeMutationDataSchema } from "../schemas.js";

export const CreateInitiativeRequestSchema = InitiativeMutationDataSchema;

export const CreateInitiativeResponseSchema = z.strictObject({
  id: IdSchema.describe("The ID of the created initiative"),
});
