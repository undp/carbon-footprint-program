import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const UpdateCountrySubsectorParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del subrubro a actualizar"),
});

export const UpdateCountrySubsectorRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "El nombre es obligatorio" })
      .max(255, { message: "El nombre no puede superar los 255 caracteres" })
      .optional()
      .describe("Nuevo nombre del subrubro"),
    countrySectorId: IdSchema.optional().describe("Nuevo rubro padre"),
    description: z
      .string()
      .trim()
      .max(2000, {
        message: "La descripción no puede superar los 2000 caracteres",
      })
      .nullable()
      .optional()
      .describe("Nueva descripción del subrubro (null para limpiar)"),
  })
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Se requiere al menos un campo para actualizar",
  });

export const UpdateCountrySubsectorResponseSchema = AdminCountrySubsectorSchema;
