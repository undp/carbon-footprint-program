import { z } from "zod";
import {
  CarbonInventoryBaseSchema,
  OrganizationSummaryBaseSchema,
} from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";

export const GetCarbonInventoryByIdParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const LineItemSchema = z
  .object({
    id: IdSchema.describe("The ID of the line"),
    subcategoryId: IdSchema.describe("The ID of the subcategory"),
    isManualTotalEmissions: z
      .boolean()
      .describe("Whether manual total emissions are used"),
    dimensionValue1Id: IdSchema.nullable().describe(
      "The ID of the first dimension value (position 1)"
    ),
    dimensionValue2Id: IdSchema.nullable().describe(
      "The ID of the second dimension value (position 2)"
    ),
    quantity: z
      .number()
      .nonnegative()
      .nullable()
      .describe("The quantity value"),
    measurementUnitId: IdSchema.nullable().describe(
      "The ID of the measurement unit"
    ),
    factorSource: z.string().nullable().describe("The source of the factor"),
    factorValue: z.number().nullable().describe("The factor value"),
    factorRateMeasurementUnitId: IdSchema.nullable().describe(
      "The ID of the rate measurement unit of the factor"
    ),
    comment: z.string().nullable().describe("Comment for the line"),
    manualTotalEmissions: z
      .number()
      .nullable()
      .describe("Manual total emissions value"),
  })
  .strict();

const SubcategoryItemSchema = z
  .object({
    id: IdSchema.describe("The ID of the subcategory"),
    isTotalManualEmissionsModeAvailable: z
      .boolean()
      .describe(
        "Whether manual total emissions mode is available for this subcategory"
      ),
    isTotalManualEmissionsModeActive: z
      .boolean()
      .describe("Whether manual total emissions are used"),
    lines: z
      .array(LineItemSchema)
      .describe("The lines associated with this subcategory"),
  })
  .strict();

export const GetCarbonInventoryByIdResponseSchema =
  CarbonInventoryBaseSchema.omit({ status: true }).extend({
    organizationName: OrganizationSummaryBaseSchema.shape.name.nullable(),
    status: CarbonInventoryDisplayStatusSchema,
    subcategories: z
      .array(SubcategoryItemSchema)
      .describe("The subcategories associated with this inventory"),
  });
