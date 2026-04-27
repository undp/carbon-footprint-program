import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const DeleteCountrySectorParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del rubro a eliminar"),
});

export const DeleteCountrySectorResponseSchema = AdminCountrySectorSchema;
