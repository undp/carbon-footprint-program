import { z } from "zod";
import { ExplanationBaseSchema } from "../../../baseSchemas/index.js";

export const GetAllExplanationsResponseSchema = z.array(
  ExplanationBaseSchema.pick({
    slug: true,
    name: true,
    description: true,
    content: true,
  })
);
