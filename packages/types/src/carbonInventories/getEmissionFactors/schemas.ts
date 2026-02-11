import { z } from "zod";

const EmissionFactorRowSchema = z
  .object({
    id: z.string().describe("Unique identifier for the row"),
    categoryName: z.string().describe("The category name"),
    categorySynonyms: z
      .string()
      .nullable()
      .describe(
        "A synonym for the category name, used for matching inventory items to emission factors"
      ),
    categoryPosition: z
      .number()
      .int()
      .positive()
      .describe("The category position for alcance badge coloring"),
    subcategoryName: z.string().describe("The subcategory name"),
    activityParameter: z
      .string()
      .describe(
        "Dimension value name or description of the activity parameter"
      ),
    factorLabel: z
      .string()
      .describe("Total factor value with unit, e.g. '2.395 kg CO₂e/ton'"),
    gasBreakdownLines: z
      .array(z.string())
      .describe(
        "Individual gas breakdown strings, e.g. ['2.370 kg CO₂e of CO₂/ton', '0.63 kg CO₂e of CH4/ton']"
      ),
    factorSource: z
      .string()
      .describe("The source of the emission factor, e.g. 'DEFRA 2025'"),
    factorSourceDetail: z
      .string()
      .nullable()
      .describe(
        "Additional source detail in italics, e.g. 'Fuels - Coal (industrial) - tonnes'"
      ),
  })
  .strict();

export const GetEmissionFactorsResponseSchema = z
  .array(EmissionFactorRowSchema)
  .describe(
    "All emission factors used in the inventory, ordered by category position then subcategory name"
  );
