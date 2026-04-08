import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetOrganizationHistoryParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});
