import { ExplanationBaseSchema } from "../../baseSchemas/index.js";

export const GetExplanationBySlugParamsSchema = ExplanationBaseSchema.pick({
  slug: true,
}).strict();

export const GetExplanationBySlugResponseSchema = ExplanationBaseSchema.pick({
  slug: true,
  content: true,
});
