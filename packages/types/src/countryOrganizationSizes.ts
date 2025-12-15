import { z } from "zod";

export const CountryOrganizationSizeSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of organization size"),
  name: z.string().min(1).describe("The name of organization size"),
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
