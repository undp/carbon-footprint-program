import { z } from "zod";

import { IdSchema } from "../../../zod.js";

export const DeleteInitiativeParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the initiative to delete"),
});

export const DeleteInitiativeResponseSchema = z.strictObject({});
