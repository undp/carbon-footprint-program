import { z } from "zod";
import { TEMP_ROW_PREFIX } from "../utils/temporaryRowId";

export { TEMP_ROW_PREFIX };

export const SubcategoryRecommendationRowSchema = z.object({
  id: z.string(),
  sectorId: z.string().min(1, { message: "El sector es obligatorio" }),
  subsectorId: z.string().nullable(),
  subcategoryIds: z.array(z.string()),
  sectorName: z.string(),
  subsectorName: z.string().nullable(),
});

export type SubcategoryRecommendationRow = z.infer<
  typeof SubcategoryRecommendationRowSchema
>;

export const isNewRow = (id: string): boolean => id.startsWith(TEMP_ROW_PREFIX);
