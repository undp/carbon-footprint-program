import { z } from "zod";

export const TEMP_ROW_PREFIX = "temp_";

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
