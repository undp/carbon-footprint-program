import { z } from "zod";
import { SubcategoryRecommendationGroupSchema } from "../listSubcategoryRecommendations/schemas.js";

export const UpdateSubcategoryRecommendationQuerySchema = z.object({
  sectorId: z.coerce.number().int().positive(),
  subsectorId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().positive().nullable()
  ),
});

export const UpdateSubcategoryRecommendationBodySchema = z
  .object({
    subcategoryIds: z.array(z.number().int().positive()),
  })
  .refine(
    (data) => new Set(data.subcategoryIds).size === data.subcategoryIds.length,
    { message: "subcategoryIds must be unique" }
  );

export const UpdateSubcategoryRecommendationResponseSchema =
  SubcategoryRecommendationGroupSchema;

export type UpdateSubcategoryRecommendationQuery = z.infer<
  typeof UpdateSubcategoryRecommendationQuerySchema
>;

export type UpdateSubcategoryRecommendationBody = z.infer<
  typeof UpdateSubcategoryRecommendationBodySchema
>;

export type UpdateSubcategoryRecommendationResponse = z.infer<
  typeof UpdateSubcategoryRecommendationResponseSchema
>;
