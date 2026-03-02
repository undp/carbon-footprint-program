import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";

export const OrganizationMainActivityBaseSchema = z.object({
  id: IdSchema.describe(
    "The unique identifier for the organization main activity."
  ),
  name: z.string().describe("The name of the organization main activity."),
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
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created the organization main activity."),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe(
      "The ID of the user who last updated the organization main activity."
    ),
});
