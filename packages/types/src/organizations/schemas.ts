import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionStatus } from "@repo/database/enums";
import {
  CountryJobPositionBaseSchema,
  CountryOrganizationSizeBaseSchema,
  CountrySectorBaseSchema,
  CountrySubsectorBaseSchema,
  OrganizationMainActivityBaseSchema,
} from "../baseSchemas/index.js";
import { IS_DEVELOPMENT } from "../environment.js";

export const OrganizationDisplayStatusSchema = z.enum([
  "ACCREDITED",
  "NOT_ACCREDITED",
  "BLOCKED",
]);

const RepresentativeItemSchema = z.object({
  fullName: z.string().nullable().describe("Full name of the representative"),
  taxId: z.string().nullable().describe("Tax ID of the representative"),
  position: CountryJobPositionBaseSchema.pick({
    id: true,
    name: true,
  })
    .nullable()
    .describe("Job position of the representative"),
  email: z.email().nullable().describe("Email of the representative"),
  phone: z.string().nullable().describe("Phone number of the representative"),
});

export const OrganizationDisplayStatusValues =
  OrganizationDisplayStatusSchema.enum;

const minLength = IS_DEVELOPMENT ? 0 : 1;

// Organization mutation data (for POST/PATCH endpoints)
export const OrganizationMutationDataSchema = z
  .object({
    legalName: z
      .string()
      .min(minLength)
      .describe("Legal name of the organization"),
    tradeName: z.string().nullable().describe("Trade name of the organization"),
    taxId: z
      .string()
      .min(minLength)
      .nullable()
      .describe("Tax ID of the organization"),
    countryOrganizationSizeId: IdSchema.nullable().describe(
      "ID of the organization size classification"
    ),
    sectorId: IdSchema.nullable().describe("ID of the organization sector"),
    subsectorId: IdSchema.nullable().describe(
      "ID of the organization subsector"
    ),
    employeesCount: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .describe("Number of employees"),
    address: z.string().nullable().describe("Physical address"),
    mainActivityId: IdSchema.nullable().describe(
      "ID of the main business activity"
    ),
    representativeFullName: z
      .string()
      .min(minLength)
      .nullable()
      .describe("Full name of representative"),
    representativeTaxId: z
      .string()
      .min(minLength)
      .nullable()
      .describe("Tax ID of representative"),
    representativePositionId: IdSchema.nullable().describe(
      "ID of representative's job position"
    ),
    representativePhone: z
      .string()
      .min(minLength)
      .nullable()
      .describe("Phone of representative"),
    representativeEmail: z
      .email()
      .min(minLength)
      .nullable()
      .describe("Email of representative"),
  })
  .strict(); // strict to disallow extra fields

export const CommonOrganizationFieldsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
  name: z.string().describe("Display name of the organization"),
  lastSubmissionStatus: z
    .enum(SubmissionStatus)
    .nullable()
    .describe("Submission status: PENDING | APPROVED | REJECTED | null"),
  hasUnsubmittedChanges: z
    .boolean()
    .describe("Whether the organization has any unsubmitted changes"),
});

export const CompleteOrganizationInfoSchema =
  CommonOrganizationFieldsSchema.extend({
    taxId: z.string().nullable().describe("Tax ID of the organization"),
    legalName: z.string().describe("Legal name of the organization"),
    tradeName: z.string().nullable().describe("Trade name of the organization"),
    isEditable: z.boolean().describe("Whether the organization is editable"),
    sector: CountrySectorBaseSchema.pick({
      id: true,
      name: true,
    })
      .nullable()
      .describe("Organization sector"),
    subsector: CountrySubsectorBaseSchema.pick({
      id: true,
      name: true,
    })
      .nullable()
      .describe("Organization subsector"),
    countryOrganizationSize: CountryOrganizationSizeBaseSchema.pick({
      id: true,
      name: true,
    })
      .nullable()
      .describe("Organization size classification"),
    mainActivity: OrganizationMainActivityBaseSchema.pick({
      id: true,
      name: true,
    })
      .nullable()
      .describe("Main business activity"),
    address: z.string().nullable().describe("Physical address"),
    employeesCount: z
      .number()
      .int()
      .min(0)
      .nullable()
      .describe("Number of employees"),
    representative: RepresentativeItemSchema.describe(
      "Organization representative details"
    ),
    status: OrganizationDisplayStatusSchema.describe(
      "Organization status: ACCREDITED | NOT_ACCREDITED | BLOCKED"
    ),
  });
