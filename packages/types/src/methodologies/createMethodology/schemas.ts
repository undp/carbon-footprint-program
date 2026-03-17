import { z } from "zod";

import { MethodologyVersionBaseSchema } from "../../baseSchemas/index.js";

// Request Schema
export const CreateMethodologyRequestSchema = MethodologyVersionBaseSchema.pick(
  {
    name: true,
    description: true,
    regulation: true,
    version: true,
  }
).strict();

// Response Schema
export const CreateMethodologyResponseSchema = MethodologyVersionBaseSchema;

// Form Schema
export const MethodologyVersionFormSchema = MethodologyVersionBaseSchema.pick({
  id: true,
  name: true,
  description: true,
  regulation: true,
  version: true,
  status: true,
}).extend({
  id: z.string().min(1), // Override IdSchema to allow temp_ IDs for new rows
  name: z
    .string()
    .trim()
    .min(1, "Nombre es requerido")
    .max(255, "Nombre no puede exceder 255 caracteres"),
  description: z
    .string()
    .trim()
    .min(1, "Descripción es requerida")
    .max(255, "Descripción no puede exceder 255 caracteres"),
  regulation: z
    .string()
    .trim()
    .min(1, "Regulación es requerida")
    .max(255, "Regulación no puede exceder 255 caracteres"),
  version: z
    .string()
    .trim()
    .min(1, "Versión es requerida")
    .max(100, "Versión no puede exceder 100 caracteres"),
});
