import { z } from "zod";
import type {
  PaginationMetadataSchema,
  AdminOrganizationListItemSchema,
} from "./schemas.js";

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

export type AdminOrganizationListItem = z.infer<
  typeof AdminOrganizationListItemSchema
>;
