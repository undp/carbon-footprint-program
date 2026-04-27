import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const DeleteCountryOrganizationSizeParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del tamaño de organización a eliminar"),
});

export const DeleteCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
