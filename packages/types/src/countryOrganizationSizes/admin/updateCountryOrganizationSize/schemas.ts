import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const UpdateCountryOrganizationSizeParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del tamaño de organización a actualizar"),
});

export const UpdateCountryOrganizationSizeRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "El nombre es obligatorio" })
      .max(255, { message: "El nombre no puede superar los 255 caracteres" })
      .optional()
      .describe("Nuevo nombre"),
    description: z
      .string()
      .trim()
      .max(2000, {
        message: "La descripción no puede superar los 2000 caracteres",
      })
      .nullable()
      .optional()
      .describe("Nueva descripción (null para limpiar)"),
  })
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Se requiere al menos un campo para actualizar",
  });

export const UpdateCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
