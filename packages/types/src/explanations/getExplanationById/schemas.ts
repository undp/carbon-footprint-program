import { ExplanationBaseSchema } from "../../baseSchemas/index.js";

export const GetExplanationByIdParamsSchema = ExplanationBaseSchema.pick({
  id: true,
}).strict();

export const GetExplanationByIdResponseSchema = ExplanationBaseSchema.pick({
  id: true,
  name: true,
  content: true,
});
