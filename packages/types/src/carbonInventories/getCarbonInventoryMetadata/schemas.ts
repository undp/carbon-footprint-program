import { z } from "zod";
import {
  CarbonInventoryBaseSchema,
  CountryBaseSchema,
  CountryOrganizationSizeBaseSchema,
  CountrySectorBaseSchema,
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
    status: CarbonInventoryDisplayStatusSchema,
    canEdit: z
      .boolean()
      .describe(
        "Whether the requesting user is allowed to edit this inventory (combines edit-role and editable-status checks)"
      ),
  })
  .strict();
