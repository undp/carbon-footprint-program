import { z } from "zod";
import { CategoryBaseSchema } from "../../baseSchemas/category.js";
import { SubcategoryBaseSchema } from "../../baseSchemas/subcategory.js";
import { EmissionFactorBaseSchema } from "../../baseSchemas/emissionFactor.js";
import { IdSchema } from "../../zod.js";

export const GetEmissionFactorsParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const ItemSchema = z
  .object({
    id: z.string().describe("Emission factor ID"),
    categoryName: CategoryBaseSchema.shape.name,
    categorySynonyms: CategoryBaseSchema.shape.synonyms,
    categoryPosition: CategoryBaseSchema.shape.position,
    categoryColor: CategoryBaseSchema.shape.color,
    subcategoryName: SubcategoryBaseSchema.shape.name,
    activityParameter: z
      .string()
      .describe(
        "Dimension value name or description of the activity parameter"
      ),
    factorValue: z.number().describe("Total factor value, e.g. 2.395"),
    rateUnit: z
      .string()
      .describe("Unit for the factor value, e.g. 'kg CO₂e/ton'"),
    gasBreakdownLines: z
      .array(
        z.object({
          value: z.number().describe("Per-gas factor value"),
          gas: z
            .string()
            .describe("Gas display label, e.g. 'CO₂', 'CH4', 'N₂O'"),
        })
      )
      .describe(
        "Per-gas factor breakdown. Render as `<formatted value> kg CO₂e of <gas>/<denominator>` where the denominator is derived from `rateUnit`."
      ),
    factorSource: EmissionFactorBaseSchema.shape.source,
    factorSourceDetail: z
      .string()
      .nullable()
      .describe(
        "Additional source detail in italics, e.g. 'Fuels - Coal (industrial) - tonnes'"
      ),
  })
  .strict();

export const GetEmissionFactorsResponseSchema = z
  .array(ItemSchema)
  .describe(
    "All emission factors used in the inventory, ordered by category position then subcategory name"
  );
