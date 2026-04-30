import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const UpdateCountrySectorParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country sector to update"),
});

export const UpdateCountrySectorRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(255, { message: "Name cannot exceed 255 characters" })
      .optional()
      .describe("New name of the country sector"),
    description: z
      .string()
      .trim()
      .max(2000, { message: "Description cannot exceed 2000 characters" })
      .nullable()
      .optional()
      .describe("New description of the country sector (null to clear)"),
  })
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field is required to update",
  });

export const UpdateCountrySectorResponseSchema = AdminCountrySectorSchema;
