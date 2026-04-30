import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const UpdateOrganizationMainActivityParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the organization main activity to update"),
});

export const UpdateOrganizationMainActivityRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required" })
      .max(255, { message: "Name cannot exceed 255 characters" })
      .optional()
      .describe("New name of the organization main activity"),
    countrySectorId: IdSchema.nullable()
      .optional()
      .describe("New parent country sector ID (null to clear)"),
    countrySubsectorId: IdSchema.nullable()
      .optional()
      .describe("New parent country subsector ID (null to clear)"),
    description: z
      .string()
      .trim()
      .max(2000, { message: "Description cannot exceed 2000 characters" })
      .nullable()
      .optional()
      .describe(
        "New description of the organization main activity (null to clear)"
      ),
  })
  .strict()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field is required to update",
  });

export const UpdateOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
