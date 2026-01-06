import { z } from "zod";
import { IdSchema } from "./zod.js";

export const CountryOrganizationSizeSchema = z.object({
  id: IdSchema.describe("The ID of the organization size"),
  name: z.string().min(1).describe("The name of the organization size"),
});

export const GetAllCountryOrganizationSizesResponseSchema = z.array(
  CountryOrganizationSizeSchema
);

export type CountryOrganizationSize = z.infer<
  typeof CountryOrganizationSizeSchema
>;
export type GetAllCountryOrganizationSizesResponse = z.infer<
  typeof GetAllCountryOrganizationSizesResponseSchema
>;
