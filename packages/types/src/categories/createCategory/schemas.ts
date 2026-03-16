import { z } from "zod";

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

// Form Schema
export const CategoryFormSchema = CategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
  examples: true,
  position: true,
}).extend({
  id: z.string().min(1), // Override IdSchema to allow temp_ IDs for new rows
  name: z
    .string()
    .min(1, "Nombre es requerido")
    .max(255, "Nombre no puede exceder 255 caracteres"),
  synonyms: z.string().min(1, "Categoría/Alcance es requerido"),
  description: z.string().min(1, "Descripción es requerida"),
});
