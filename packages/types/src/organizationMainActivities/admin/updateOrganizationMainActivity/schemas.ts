import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const UpdateOrganizationMainActivityParamsSchema = z.strictObject({
  id: IdSchema.describe("ID de la actividad principal a actualizar"),
});

export const UpdateOrganizationMainActivityRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "El nombre es obligatorio" })
      .max(255, { message: "El nombre no puede superar los 255 caracteres" })
      .optional()
      .describe("Nuevo nombre"),
    countrySectorId: IdSchema.nullable()
      .optional()
      .describe("Nuevo rubro padre"),
    countrySubsectorId: IdSchema.nullable()
      .optional()
      .describe("Nuevo subrubro padre"),
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

export const UpdateOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
