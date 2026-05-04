import { z } from "zod";
import {
  CarbonInventoryBaseSchema,
  OrganizationSummaryBaseSchema,
  SubmissionTypeSchema,
} from "../../baseSchemas/index.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";
import { OrganizationDisplayStatusSchema } from "../../organizations/index.js";
import { IdSchema } from "../../zod.js";
import { SubmissionType } from "../../enums.js";

// Query schema
export const GetAllCarbonInventoriesQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/, "Year must be a valid number")
    .optional()
    .describe(
      'Optional year filter. Must be a number (e.g., "2024"). Omit to get all years.'
    ),
  organizationId: IdSchema.optional().describe(
    "Optional organization ID filter. Omit to get all organizations."
  ),
  withoutOrganization: z
    .string()
    .optional()
    .refine((val) => val === "true" || val === "false", {
      message: 'Must be "true" or "false"',
    })
    .describe(
      "If true, only returns inventories without an associated organization. Cannot be used with organizationId."
    ),
});

// Response item schema with totalEmissions field added
const CarbonInventoryItem = CarbonInventoryBaseSchema.omit({
  status: true,
}).extend({
  status: CarbonInventoryDisplayStatusSchema,
  totalEmissions: z
    .number()
    .describe("The total calculated emissions for this inventory"),
  organizationName: OrganizationSummaryBaseSchema.shape.name
    .nullable()
    .describe(
      "The name of the associated organization, or null if no organization is associated."
    ),
  organizationDisplayStatus:
    OrganizationDisplayStatusSchema.nullable().describe(
      "The display status of the associated organization, or null if no organization is associated."
    ),
  recognitions: z
    .array(
      SubmissionTypeSchema.exclude([SubmissionType.ORGANIZATION_ACCREDITATION])
    )
    .describe("List of recognition types earned by this carbon inventory."),
  areAllActiveLinesCompleted: z
    .boolean()
    .describe(
      "True when the inventory has at least one ACTIVE line and every ACTIVE line has a calculated result."
    ),
});

// Response Schemas
export const GetAllCarbonInventoriesResponseSchema =
  z.array(CarbonInventoryItem);
