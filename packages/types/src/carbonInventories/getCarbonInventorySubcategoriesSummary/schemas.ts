import { z } from "zod";
import { SubcategoryBaseSchema } from "../../baseSchemas/subcategory.js";

const ItemSchema = z.object({
  subcategoryId: SubcategoryBaseSchema.shape.id,
  included: z
    .boolean()
    .describe("Indicates if there is an active line for this subcategory"),
  edited: z
    .boolean()
    .describe("Indicates if the line has been edited (has data) or is empty"),
});

export const GetCarbonInventorySubcategoriesSummaryResponseSchema =
  z.array(ItemSchema);
