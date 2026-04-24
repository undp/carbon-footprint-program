import { z } from "zod";
import { SubcategoryRecommendationGroupSchema } from "../listSubcategoryRecommendations/schemas.js";

export const CreateSubcategoryRecommendationBodySchema = z.object({
  sectorId: z.number().int().positive(),
  subsectorId: z.number().int().positive().nullable(),
  subcategoryIds: z
    .array(z.number().int().positive())
    .min(1, { message: "Se requiere al menos una subcategoría" })
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "subcategoryIds must be unique",
    }),
});

export const CreateSubcategoryRecommendationResponseSchema =
  SubcategoryRecommendationGroupSchema;

export type CreateSubcategoryRecommendationBody = z.infer<
  typeof CreateSubcategoryRecommendationBodySchema
>;

export type CreateSubcategoryRecommendationResponse = z.infer<
  typeof CreateSubcategoryRecommendationResponseSchema
>;
