import { z } from "zod";

export const SubcategoryRecommendationGroupSchema = z.object({
  sectorId: z.number().int().positive(),
  subsectorId: z.number().int().positive().nullable(),
  sectorName: z.string(),
  subsectorName: z.string().nullable(),
  subcategoryIds: z.array(z.number().int().positive()),
});

export const ListSubcategoryRecommendationsResponseSchema = z.array(
  SubcategoryRecommendationGroupSchema
);

export type SubcategoryRecommendationGroup = z.infer<
  typeof SubcategoryRecommendationGroupSchema
>;

export type ListSubcategoryRecommendationsResponse = z.infer<
  typeof ListSubcategoryRecommendationsResponseSchema
>;
