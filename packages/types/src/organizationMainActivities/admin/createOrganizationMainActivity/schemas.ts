import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const CreateOrganizationMainActivityRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" })
    .max(255, { message: "El nombre no puede superar los 255 caracteres" })
    .describe("Nombre de la actividad principal"),
  countrySectorId: IdSchema.nullable()
    .optional()
    .describe("ID del rubro asociado (opcional)"),
  countrySubsectorId: IdSchema.nullable()
    .optional()
    .describe("ID del subrubro asociado (opcional)"),
  description: z
    .string()
    .trim()
    .max(2000, {
      message: "La descripción no puede superar los 2000 caracteres",
    })
    .nullable()
    .optional()
    .describe("Descripción opcional"),
});

export const CreateOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
