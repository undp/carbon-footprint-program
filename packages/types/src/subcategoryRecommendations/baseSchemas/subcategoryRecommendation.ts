import { z } from "zod";

export const SubcategoryRecommendationBaseSchema = z.object({
  id: z.string(),
  subcategoryId: z.number().int().positive(),
  sectorId: z.number().int().positive(),
  subsectorId: z.number().int().positive().nullable(),
  status: z.enum(["ACTIVE", "DELETED"]),
  createdById: z.string().nullable(),
  updatedById: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
});

export type SubcategoryRecommendationBase = z.infer<
  typeof SubcategoryRecommendationBaseSchema
>;
