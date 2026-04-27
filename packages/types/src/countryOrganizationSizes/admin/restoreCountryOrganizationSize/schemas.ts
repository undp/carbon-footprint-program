import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const RestoreCountryOrganizationSizeParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del tamaño de organización a restaurar"),
});

export const RestoreCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
