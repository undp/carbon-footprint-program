import { z } from "zod";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const CreateCountrySectorRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" })
    .max(255, { message: "El nombre no puede superar los 255 caracteres" })
    .describe("Nombre del rubro"),
  description: z
    .string()
    .trim()
    .max(2000, {
      message: "La descripción no puede superar los 2000 caracteres",
    })
    .nullable()
    .describe("Descripción opcional del rubro"),
});

export const CreateCountrySectorResponseSchema = AdminCountrySectorSchema;
