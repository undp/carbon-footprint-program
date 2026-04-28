import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const CreateCountrySubsectorRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" })
    .max(255, { message: "El nombre no puede superar los 255 caracteres" })
    .describe("Nombre del subrubro"),
  countrySectorId: IdSchema.describe("ID del rubro padre"),
  description: z
    .string()
    .trim()
    .max(2000, {
      message: "La descripción no puede superar los 2000 caracteres",
    })
    .nullable()
    .describe("Descripción opcional del subrubro"),
});

export const CreateCountrySubsectorResponseSchema = AdminCountrySubsectorSchema;
