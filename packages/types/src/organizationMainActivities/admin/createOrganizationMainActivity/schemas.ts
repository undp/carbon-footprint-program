import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const CreateOrganizationMainActivityRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(255, { message: "Name cannot exceed 255 characters" })
    .describe("The name of the organization main activity"),
  countrySectorId: IdSchema.nullable().describe(
    "The ID of the associated country sector"
  ),
  countrySubsectorId: IdSchema.nullable().describe(
    "The ID of the associated country subsector"
  ),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Description cannot exceed 2000 characters" })
    .nullable()
    .describe("Optional description of the organization main activity"),
});

export const CreateOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
