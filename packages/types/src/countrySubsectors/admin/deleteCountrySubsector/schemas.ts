import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const DeleteCountrySubsectorParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country subsector to delete"),
});

export const DeleteCountrySubsectorResponseSchema = AdminCountrySubsectorSchema;
