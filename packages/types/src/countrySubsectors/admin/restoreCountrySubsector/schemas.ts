import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const RestoreCountrySubsectorParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country subsector to restore"),
});

export const RestoreCountrySubsectorResponseSchema =
  AdminCountrySubsectorSchema;
