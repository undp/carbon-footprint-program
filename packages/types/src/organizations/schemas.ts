import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubmissionStatus } from "@repo/database/enums";
import {
  CountryJobPositionBaseSchema,
  CountryOrganizationSizeBaseSchema,
  CountrySectorBaseSchema,
  CountrySubsectorBaseSchema,
  OrganizationMainActivityBaseSchema,
  TerritoryBaseSchema,
} from "../baseSchemas/index.js";
import { LOCAL_BYPASS_REQUIRED_FIELDS } from "../environment.js";

export const OrganizationDisplayStatusSchema = z.enum([
  "ACCREDITED",
  "NOT_ACCREDITED",
  "BLOCKED",
]);

const TerritoryItemSchema = TerritoryBaseSchema.pick({
  id: true,
  name: true,
  level: true,
});

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

// When LOCAL_BYPASS_REQUIRED_FIELDS=true, relaxes minLength to 0 so developers
// can submit forms without filling every field during local testing.
const minLength = LOCAL_BYPASS_REQUIRED_FIELDS ? 0 : 1;

// Organization mutation data (for POST/PATCH endpoints).
//
// Every free-text field is `.trim()`ed before validation, so nothing is ever
// stored whitespace-padded: `legalName`, `tradeName` and `taxId` are matched
// against other organizations by the identity-collision detection, and padding
// would silently change a value's identity ("Acme SRL " ≠ "Acme SRL"). Trimming
// first also makes `.min(1)` reject a whitespace-only value, which used to pass.
export const OrganizationMutationDataSchema = z
  .object({
    legalName: z
      .string()
      .trim()
      .min(minLength)
      .describe("Legal name of the organization"),
    tradeName: z
      .string()
      .trim()
      .nullable()
      .describe("Trade name of the organization"),
    taxId: z
      .string()
      .trim()
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
    secondarySubsectorId: IdSchema.nullable().describe(
      "ID of the organization's secondary economic activity. Selected from the " +
        "same catalog as `subsectorId` and not constrained to `sectorId`, so a " +
        "cross-sector secondary activity is expressible."
    ),
    territoryId: IdSchema.nullable().describe(
      "ID of the most specific territorial node the registrant knows. Its " +
        "ancestors are derived from the hierarchy, never sent."
    ),
    employeesCount: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .describe("Number of employees"),
    address: z.string().trim().nullable().describe("Physical address"),
    mainActivityId: IdSchema.nullable().describe(
      "ID of the main business activity"
    ),
    representativeFullName: z
      .string()
      .trim()
      .min(minLength)
      .nullable()
      .describe("Full name of representative"),
    representativeTaxId: z
      .string()
      .trim()
      .min(minLength)
      .nullable()
      .describe("Tax ID of representative"),
    representativePositionId: IdSchema.nullable().describe(
      "ID of representative's job position"
    ),
    representativePhone: z
      .string()
      .trim()
      .min(minLength)
      .nullable()
      .describe("Phone of representative"),
    representativeEmail: z
      .email()
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
    secondarySubsector: CountrySubsectorBaseSchema.pick({
      id: true,
      name: true,
    })
      .nullable()
      .describe("Organization's secondary economic activity"),
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
    territory: TerritoryItemSchema.nullable().describe(
      "Most specific territorial node the organization declared"
    ),
    territoryAncestors: z
      .array(TerritoryItemSchema)
      .describe(
        "Ancestors of `territory`, outermost first. Empty when `territory` is " +
          "null or is itself a root of the hierarchy."
      ),
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
