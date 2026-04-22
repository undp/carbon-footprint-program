import { z } from "zod";

import { CategoryBaseSchema } from "../../baseSchemas/index.js";
import { IconNameFormSchema } from "../../common/index.js";

// Request Schema
export const CreateCategoryRequestSchema = CategoryBaseSchema.pick({
  methodologyVersionId: true,
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
  explanation: true,
  position: true,
})
  .partial({ explanation: true })
  .strict();

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
  explanation: true,
  position: true,
}).extend({
  id: z.string().min(1), // Override IdSchema to allow temp_ IDs for new rows
  name: z
    .string()
    .trim()
    .min(1, "Nombre es requerido")
    .max(255, "Nombre no puede exceder 255 caracteres"),
  icon: IconNameFormSchema,
  color: z
    .string()
    .trim()
    .min(1, "Color es requerido")
    .regex(
      /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
      "Color debe ser un código hexadecimal válido"
    ),
  synonyms: z.string().trim().min(1, "Categoría/Alcance es requerido"),
  description: z.string().trim().min(1, "Descripción es requerida"),
  position: z
    .number({ error: "Posición debe ser un número" })
    .int("Posición debe ser un número entero")
    .min(1, "Posición debe ser mayor a 0"),
});
