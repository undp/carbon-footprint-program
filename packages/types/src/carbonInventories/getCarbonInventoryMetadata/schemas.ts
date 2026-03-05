import { z } from "zod";
import {
  CarbonInventoryBaseSchema,
  CountryBaseSchema,
  CountryOrganizationSizeBaseSchema,
  CountrySectorBaseSchema,
  OrganizationMainActivityBaseSchema,
  OrganizationSummaryBaseSchema,
} from "../../baseSchemas/index.js";

export const GetCarbonInventoryMetadataResponseSchema = z
  .object({
    id: CarbonInventoryBaseSchema.shape.id,
    name: CarbonInventoryBaseSchema.shape.name,
    country: CountryBaseSchema.shape.name.nullable(),
    organizationName: OrganizationSummaryBaseSchema.shape.name.nullable(),
    organizationBranchesQuantity: z
      .int()
      .nullable()
      .describe("The quantity of the organization's branches"),
    organizationSectorName: CountrySectorBaseSchema.shape.name.nullable(),
    organizationSizeName:
      CountryOrganizationSizeBaseSchema.shape.name.nullable(),
    organizationMainActivityName:
      OrganizationMainActivityBaseSchema.shape.name.nullable(),
    organizationMainActivityQuantity: z
      .number()
      .nullable()
      .describe("The quantity of the organization main activity"),
  })
  .strict();
