import { z } from "zod";
import type {
  EntityReferenceSchema,
  OrganizationDisplayStatusSchema,
  OrganizationListItemSchema,
} from "./baseSchemas.js";

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

export type OrganizationDisplayStatus = z.infer<
  typeof OrganizationDisplayStatusSchema
>;

export type OrganizationListItem = z.infer<typeof OrganizationListItemSchema>;
