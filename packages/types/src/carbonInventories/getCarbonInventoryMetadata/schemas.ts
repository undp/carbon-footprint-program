import { z } from "zod";
import {
  CarbonInventoryBaseSchema,
  CountryBaseSchema,
  CountryOrganizationSizeBaseSchema,
  CountrySectorBaseSchema,
  CountrySubsectorBaseSchema,
  OrganizationMainActivityBaseSchema,
  OrganizationSummaryBaseSchema,
} from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";

export const GetCarbonInventoryMetadataParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetCarbonInventoryMetadataResponseSchema = z
  .object({
    id: CarbonInventoryBaseSchema.shape.id,
    name: CarbonInventoryBaseSchema.shape.name,
    year: CarbonInventoryBaseSchema.shape.year,
    country: CountryBaseSchema.shape.name.nullable(),
    organizationName: OrganizationSummaryBaseSchema.shape.name.nullable(),
    organizationSectorName: CountrySectorBaseSchema.shape.name.nullable(),
    organizationSubsectorName: CountrySubsectorBaseSchema.shape.name.nullable(),
    organizationSizeName:
      CountryOrganizationSizeBaseSchema.shape.name.nullable(),
    organizationMainActivityName:
      OrganizationMainActivityBaseSchema.shape.name.nullable(),
    organizationMainActivityQuantity: z
      .number()
      .nullable()
      .describe("The quantity of the organization main activity"),
    status: CarbonInventoryDisplayStatusSchema,
  })
  .strict();
