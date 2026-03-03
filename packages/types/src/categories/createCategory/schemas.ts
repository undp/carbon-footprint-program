import { CategoryBaseSchema } from "../../baseSchemas/index.js";

// Request Schema
export const CreateCategoryRequestSchema = CategoryBaseSchema.pick({
  methodologyVersionId: true,
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
  examples: true,
  position: true,
}).strict();

// Response Schema
export const CreateCategoryResponseSchema = CategoryBaseSchema;
