import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const RestoreCountrySubsectorParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del subrubro a restaurar"),
});

export const RestoreCountrySubsectorResponseSchema =
  AdminCountrySubsectorSchema;
