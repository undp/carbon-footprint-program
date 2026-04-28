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
  countrySectorId: IdSchema.nullable().describe("ID del rubro asociado"),
  countrySubsectorId: IdSchema.nullable().describe("ID del subrubro asociado"),
  description: z
    .string()
    .trim()
    .max(2000, {
      message: "La descripción no puede superar los 2000 caracteres",
    })
    .nullable()
    .describe("Descripción opcional"),
});

export const CreateOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
