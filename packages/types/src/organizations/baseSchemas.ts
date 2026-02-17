import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionStatus } from "@repo/database";

export const EntityReferenceSchema = z.object({
  id: IdSchema.describe("The entity ID"),
  name: z.string().describe("The entity name"),
});

export const OrganizationDisplayStatusSchema = z.enum([
  "ACCREDITED",
  "NOT_ACCREDITED",
  "BLOCKED",
]);

export const OrganizationDisplayStatusValues =
  OrganizationDisplayStatusSchema.enum;

// Organization mutation data (for POST/PATCH endpoints)
export const OrganizationMutationDataSchema = z.object({
  legalName: z.string().min(1).describe("Legal name of the organization"),
  tradeName: z.string().min(1).describe("Trade name of the organization"),
  taxId: z.string().min(1).describe("Tax ID of the organization"),
  countryOrganizationSizeId: IdSchema.describe(
    "ID of the organization size classification"
  ),
  sectorId: IdSchema.describe("ID of the organization sector"),
  subsectorId: IdSchema.describe("ID of the organization subsector"),
  employeesCount: z.number().int().describe("Number of employees"),
  address: z.string().min(1).describe("Physical address"),
  representativeFullName: z
    .string()
    .min(1)
    .describe("Full name of representative"),
  representativeTaxId: z.string().min(1).describe("Tax ID of representative"),
  representativePositionId: IdSchema.describe(
    "ID of representative's job position"
  ),
  representativePhone: z.string().min(1).describe("Phone of representative"),
  representativeEmail: z.email().describe("Email of representative"),
  mainActivityId: IdSchema.describe("ID of the main business activity"),
});

export const CommonOrganizationFieldsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
  name: z.string().describe("Display name of the organization"),
  status: OrganizationDisplayStatusSchema.describe(
    "Organization status: ACCREDITED | NOT_ACCREDITED | BLOCKED"
  ),
  lastSubmissionStatus: z
    .enum(SubmissionStatus)
    .nullable()
    .describe("Submission status: PENDING | APPROVED | REJECTED | null"),
  hasUnsubmittedChanges: z
    .boolean()
    .describe("Whether the organization has any unsubmitted changes"),
});
