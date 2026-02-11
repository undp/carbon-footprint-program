import { z } from "zod";
import { OrganizationStatus } from "../../../enums.js";

const OrganizationStatusEnum = z.enum(OrganizationStatus);

export const AdminOrganizationSortBy = [
  "name",
  "sector",
  "subsector",
  "size",
  "status",
  "hasCarbonInventories",
  "lastEdition",
  "emissions",
] as const;

export const AdminOrganizationSortOrder = ["asc", "desc"] as const;

export const GetAllOrganizationsQuerySchema = z.object({
  statuses: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      const items = Array.isArray(val) ? val : [val];
      return items.flatMap((item) => item.split(","));
    })
    .pipe(z.array(OrganizationStatusEnum).min(1)),
  limit: z.coerce.number().int().min(1).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(AdminOrganizationSortBy).default("name"),
  sortOrder: z.enum(AdminOrganizationSortOrder).default("asc"),
});

export const AdminOrganizationItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  subsector: z.string().nullable(),
  size: z.string().nullable(),
  status: OrganizationStatusEnum,
  hasCarbonInventories: z.boolean(),
  lastEdition: z.string(),
  emissions: z.number(),
  awards: z.array(z.unknown()),
});

export const GetAllOrganizationsResponseSchema = z.object({
  data: z.array(AdminOrganizationItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
