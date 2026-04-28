import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const DeleteCountrySectorParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country sector to delete"),
});

export const DeleteCountrySectorResponseSchema = AdminCountrySectorSchema;
