import { z } from "zod";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const CreateCountryOrganizationSizeRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio" })
    .max(255, { message: "El nombre no puede superar los 255 caracteres" })
    .describe("Nombre del tamaño de organización"),
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

export const CreateCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
