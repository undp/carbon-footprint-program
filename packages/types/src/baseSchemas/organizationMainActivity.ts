import { z } from "zod";
import { OrganizationMainActivityStatus } from "@repo/database/enums";
import { IdSchema } from "../zod.js";

export const OrganizationMainActivityBaseSchema = z.object({
  id: IdSchema.describe(
    "The unique identifier for the organization main activity."
  ),
  name: z
    .string()
    .describe("The name of the organization main business activity."),
  description: z
    .string()
    .nullable()
    .describe("Optional description of the main activity"),
  status: z
    .enum(OrganizationMainActivityStatus)
    .describe("Lifecycle status of the main activity"),
  countrySectorId: IdSchema.nullable().describe(
    "The ID of the associated country sector."
  ),
  countrySubsectorId: IdSchema.nullable().describe(
    "The ID of the associated country subsector."
  ),
  createdAt: z.iso
    .datetime()
    .describe(
      "The date and time when the organization main activity was created."
    ),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe(
      "The date and time when the organization main activity was last updated."
    ),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the organization main activity."
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the organization main activity."
  ),
});
