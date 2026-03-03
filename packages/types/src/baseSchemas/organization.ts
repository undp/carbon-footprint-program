import { z } from "zod";
import { IdSchema } from "../zod.js";
import { OrganizationStatus } from "../enums.js";

export const OrganizationStatusSchema = z.enum(OrganizationStatus);

export const OrganizationBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the organization."),
  countryId: IdSchema.describe("The ID of the associated country."),
  status: OrganizationStatusSchema.describe("The status of the organization."),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the organization was created."),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The date and time when the organization was last updated."),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the organization."
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the organization."
  ),
});
