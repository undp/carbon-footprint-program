import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const DeleteCountryOrganizationSizeParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country organization size to delete"),
});

export const DeleteCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
