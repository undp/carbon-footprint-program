import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { OrganizationSummaryBaseSchema } from "../../baseSchemas/organizationSummary.js";
import { CountryBaseSchema } from "../../baseSchemas/country.js";
import { CountrySectorBaseSchema } from "../../baseSchemas/countrySector.js";
import { CountryOrganizationSizeBaseSchema } from "../../baseSchemas/organizationSize.js";
import { OrganizationMainActivityBaseSchema } from "../../baseSchemas/organizationMainActivity.js";
import { SubcategoryBaseSchema } from "../../baseSchemas/subcategory.js";
import { CategoryBaseSchema } from "../../baseSchemas/category.js";
import { EmissionFactorBaseSchema } from "../../baseSchemas/emissionFactor.js";
import { MeasurementUnitBaseSchema } from "../../baseSchemas/measurementUnit.js";
import { CarbonInventoryLineInputBaseSchema } from "../../baseSchemas/carbonInventoryLineInput.js";

export const GetEmissionsDetailedSummaryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const EmissionLineItemSchema = z
  .object({
    lineId: IdSchema.describe("The emission line ID"),
    emissionSource: z
      .string()
      .describe(
        "Resolved dimension value name(s) for display, e.g. 'Carbón industrial'"
      ),
    measurementUnitName: MeasurementUnitBaseSchema.shape.name.nullable(),
    quantity: CarbonInventoryLineInputBaseSchema.shape.quantity,
    factorValue: z.number().nullable(),
    factorSource: EmissionFactorBaseSchema.shape.source.nullable(),
    emissions: z
      .number()
      .nonnegative()
      .nullable()
      .describe(
        "Line emissions in tCO2e; null when the line has no computed result yet (incomplete)"
      ),
  })
  .strict();

const SubcategorySummaryItemSchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  description: true,
  icon: true,
})
  .extend({
    hasLines: z
      .boolean()
      .describe(
        "True if subcategory has factor-based lines (SIMPLIFIED/EXPERT); false for DIRECT-only"
      ),
    lines: z
      .array(EmissionLineItemSchema)
      .describe("Emission lines, present only when hasLines=true"),
    subtotal: z.number().nonnegative().describe("Subtotal emissions in tCO2e"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe("Percentage relative to total emissions (0-1)"),
    hasIncompleteLines: z
      .boolean()
      .describe(
        "True when the subcategory has active lines without a computed result; its subtotal is provisional and may grow once they are completed"
      ),
  })
  .strict();

const GHGGasBreakdownSchema = z
  .object({
    subcategoryName: SubcategoryBaseSchema.shape.name,
    totalTCO2e: z
      .number()
      .nonnegative()
      .describe("Total emissions for this subcategory in tCO2e"),
    co2Fossil: z.number().nonnegative().describe("CO2 fossil emissions"),
    ch4: z.number().nonnegative().describe("CH4 emissions"),
    n2o: z.number().nonnegative().describe("N2O emissions"),
    hfc: z.number().nonnegative().describe("HFC emissions"),
    pfc: z.number().nonnegative().describe("PFC emissions"),
    sf6: z.number().nonnegative().describe("SF6 emissions"),
    nf3: z.number().nonnegative().describe("NF3 emissions"),
  })
  .strict();

const CategorySummaryItemSchema = CategoryBaseSchema.pick({
  id: true,
  name: true,
  synonyms: true,
  position: true,
  icon: true,
  color: true,
})
  .extend({
    subcategories: z
      .array(SubcategorySummaryItemSchema)
      .describe("Subcategories with emission details"),
    subtotal: z
      .number()
      .nonnegative()
      .describe("Category subtotal emissions in tCO2e"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe("Percentage relative to total emissions (0-1)"),
    ghgBreakdown: z
      .array(GHGGasBreakdownSchema)
      .nullable()
      .describe(
        "GHG gas breakdown per subcategory. Only present for category position=1, null for others."
      ),
  })
  .strict();

const InventoryAttributesSchema = z
  .object({
    name: z.string().nullable().describe("Inventory name/measurement label"),
    companyName: OrganizationSummaryBaseSchema.shape.name.nullable(),
    countryName: CountryBaseSchema.shape.name.nullable(),
    sectorName: CountrySectorBaseSchema.shape.name.nullable(),
    sizeName: CountryOrganizationSizeBaseSchema.shape.name.nullable(),
    branchCount: z
      .number()
      .int()
      .nullable()
      .describe("Number of branches/sedes"),
    mainActivityName: OrganizationMainActivityBaseSchema.shape.name.nullable(),
    mainActivityQuantity: z
      .int()
      .nullable()
      .describe("The quantity of the main activity"),
  })
  .strict();

const EquivalenceSchema = z
  .object({
    rate: z.number().nonnegative().describe("Emissions per activity unit"),
    activityName: z.string().describe("Main activity name"),
  })
  .strict();

export const GetEmissionsDetailedSummaryResponseSchema = z
  .object({
    inventoryAttributes: InventoryAttributesSchema,
    totalEmissions: z
      .number()
      .nonnegative()
      .describe("Total emissions in tCO2e"),
    equivalence: EquivalenceSchema.nullable().describe(
      "Main activity equivalence, null if not applicable"
    ),
    categories: z
      .array(CategorySummaryItemSchema)
      .describe("Categories with full emission breakdown"),
  })
  .strict();
