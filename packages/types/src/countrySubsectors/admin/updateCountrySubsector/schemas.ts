import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const UpdateCountrySubsectorParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the country subsector to update"),
});

export const UpdateCountrySubsectorRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(255, { message: "Name cannot exceed 255 characters" })
      .optional()
      .describe("New name of the country subsector"),
    countrySectorId: IdSchema.optional().describe(
      "New parent country sector ID"
    ),
    description: z
      .string()
      .trim()
      .max(2000, { message: "Description cannot exceed 2000 characters" })
      .nullable()
      .optional()
      .describe("New description of the country subsector (null to clear)"),
  })
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field is required to update",
  });

export const UpdateCountrySubsectorResponseSchema = AdminCountrySubsectorSchema;
