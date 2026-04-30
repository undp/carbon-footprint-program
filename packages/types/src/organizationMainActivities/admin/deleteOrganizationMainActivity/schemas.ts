import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const DeleteOrganizationMainActivityParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the organization main activity to delete"),
});
