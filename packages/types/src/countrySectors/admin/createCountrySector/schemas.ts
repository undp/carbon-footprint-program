import { z } from "zod";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const CreateCountrySectorRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(255, { message: "Name cannot exceed 255 characters" })
    .describe("The name of the country sector"),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Description cannot exceed 2000 characters" })
    .nullable()
    .describe("Description of the country sector (string or null)"),
});

export const CreateCountrySectorResponseSchema = AdminCountrySectorSchema;
