import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import {
  CountrySectorSchema,
  CountrySubsectorSchema,
} from "../../../countrySectors/getAllCountrySectors/schemas.js";
import { JobPositionSchema } from "../../../jobPositions/getAllJobPositions/schemas.js";
import { CountryOrganizationSizeSchema } from "../../../countryOrganizationSizes/getAllCountryOrganizationSizes/schemas.js";

export const GetOrganizationByIdParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const GetOrganizationByIdResponseSchema = z.object({
  organizationData: z.object({
    legalName: z.string(),
    tradeName: z.string().nullable(),
    taxId: z.string(),
    organizationSize: CountryOrganizationSizeSchema.pick({
      id: true,
      name: true,
    }).nullable(),
    sector: CountrySectorSchema.pick({ id: true, name: true }).nullable(),
    subsector: CountrySubsectorSchema.pick({ id: true, name: true }).nullable(),
    numberOfEmployees: z.number().nullable(),
    address: z.string().nullable(),
  }),
  representativeData: z.object({
    fullName: z.string(),
    taxId: z.string(),
    position: JobPositionSchema,
    phone: z.string(),
    email: z.email(),
  }),
});
