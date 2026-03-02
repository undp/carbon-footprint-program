import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { OrganizationDataStatus } from "../enums.js";

export const OrganizationDataStatusSchema = z.enum(OrganizationDataStatus);

export const OrganizationDataBaseSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  status: OrganizationDataStatusSchema,
  legalName: z.string(),
  tradeName: z.string().nullable(),
  taxId: z.string(),
  countryOrganizationSizeId: IdSchema.nullable(),
  sectorId: IdSchema.nullable(),
  mainActivityId: IdSchema.nullable(),
  subsectorId: IdSchema.nullable(),
  address: z.string().nullable(),
  employeesCount: z.number().int().nullable(),
  representativeFullName: z.string(),
  representativeTaxId: z.string(),
  representativeCountryJobPositionId: IdSchema,
  representativePhone: z.string(),
  representativeEmail: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  createdById: UserBaseSchema.shape.id.nullable(),
  updatedById: UserBaseSchema.shape.id.nullable(),
});
