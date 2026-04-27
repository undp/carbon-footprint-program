import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const RestoreCountrySectorParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del rubro a restaurar"),
});

export const RestoreCountrySectorResponseSchema = AdminCountrySectorSchema;
