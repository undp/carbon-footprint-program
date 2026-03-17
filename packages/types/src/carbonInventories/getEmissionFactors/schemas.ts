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
    subcategoryName: SubcategoryBaseSchema.shape.name,
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
