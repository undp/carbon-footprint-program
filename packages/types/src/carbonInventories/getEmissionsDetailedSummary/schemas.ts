import { z } from "zod";
import { IdSchema } from "../../zod.js";

const EmissionLineSchema = z
  .object({
    lineId: IdSchema.describe("The emission line ID"),
    emissionSource: z
      .string()
      .describe(
        "Resolved dimension value name(s) for display, e.g. 'Carbón industrial'"
      ),
    measurementUnitName: z
      .string()
      .nullable()
      .describe("The measurement unit display name, e.g. 'Toneladas'"),
    quantity: z.number().nullable().describe("The input quantity"),
    factorValue: z
      .number()
      .nullable()
      .describe("The applied emission factor value in kgCO2e/unit"),
    factorSource: z
      .string()
      .nullable()
      .describe("The source of the emission factor, e.g. 'DEFRA 2025'"),
    emissions: z.number().nonnegative().describe("Line emissions in tCO2e"),
  })
  .strict();

const SubcategorySummarySchema = z
  .object({
    id: IdSchema.describe("The subcategory ID"),
    name: z.string().describe("The subcategory name"),
    description: z.string().nullable().describe("The subcategory description"),
    hasLines: z
      .boolean()
      .describe(
        "True if subcategory has factor-based lines (SIMPLIFIED/EXPERT); false for DIRECT-only"
      ),
    lines: z
      .array(EmissionLineSchema)
      .describe("Emission lines, present only when hasLines=true"),
    subtotal: z.number().nonnegative().describe("Subtotal emissions in tCO2e"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe("Percentage relative to total emissions (0-1)"),
  })
  .strict();

const GHGGasBreakdownSchema = z
  .object({
    subcategoryName: z.string().describe("The subcategory name"),
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

const CategorySummarySchema = z
  .object({
    id: IdSchema.describe("The category ID"),
    name: z.string().describe("The category name"),
    synonyms: z.string().nullable().describe("Category synonyms"),
    position: z
      .number()
      .int()
      .positive()
      .describe("The category position (1, 2, 3...)"),
    subcategories: z
      .array(SubcategorySummarySchema)
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
    companyName: z.string().nullable(),
    countryName: z.string().nullable(),
    sectorName: z.string().nullable(),
    sizeName: z.string().nullable(),
    branchCount: z
      .number()
      .int()
      .nullable()
      .describe("Number of branches/sedes"),
    mainActivityName: z.string().nullable(),
    mainActivityQuantity: z.number().nullable(),
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
      .array(CategorySummarySchema)
      .describe("Categories with full emission breakdown"),
  })
  .strict();
