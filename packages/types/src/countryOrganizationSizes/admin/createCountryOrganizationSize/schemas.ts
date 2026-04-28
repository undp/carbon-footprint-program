import { z } from "zod";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const CreateCountryOrganizationSizeRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(255, { message: "Name cannot exceed 255 characters" })
    .describe("The name of the country organization size"),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Description cannot exceed 2000 characters" })
    .nullable()
    .describe("Optional description of the country organization size"),
});

export const CreateCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
