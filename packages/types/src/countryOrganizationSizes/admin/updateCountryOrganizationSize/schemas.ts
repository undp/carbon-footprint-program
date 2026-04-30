import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const UpdateCountryOrganizationSizeParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country organization size to update"),
});

export const UpdateCountryOrganizationSizeRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(255, { message: "Name cannot exceed 255 characters" })
      .optional()
      .describe("New name of the country organization size"),
    description: z
      .string()
      .trim()
      .max(2000, { message: "Description cannot exceed 2000 characters" })
      .nullable()
      .optional()
      .describe(
        "New description of the country organization size (null to clear)"
      ),
  })
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field is required to update",
  });

export const UpdateCountryOrganizationSizeResponseSchema =
  AdminCountryOrganizationSizeSchema;
