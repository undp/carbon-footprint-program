import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import {
  CountrySectorSchema,
  CountrySubsectorSchema,
} from "../../../countrySectors/getAllCountrySectors/schemas.js";
import { JobPositionSchema } from "../../../jobPositions/getAllJobPositions/schemas.js";

export const GetOrganizationByIdParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const GetOrganizationByIdResponseSchema = z.object({
  organizationData: z.object({
    legalName: z.string(),
    tradeName: z.string().nullable(),
    taxId: z.string(),
    organizationType: z.string().nullable(),
    sector: CountrySectorSchema.pick({ id: true, name: true }).nullable(),
    subSector: CountrySubsectorSchema.pick({ id: true, name: true }).nullable(),
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
