import { z } from "zod";

const SubcategoryStatusSchema = z.object({
  subcategoryId: z.string().describe("The ID of the subcategory"),
  included: z
    .boolean()
    .describe("Indicates if there is an active line for this subcategory"),
  edited: z
    .boolean()
    .describe("Indicates if the line has been edited (has data) or is empty"),
});

export const GetCarbonInventorySubcategoriesSummaryResponseSchema = z.array(
  SubcategoryStatusSchema
);
