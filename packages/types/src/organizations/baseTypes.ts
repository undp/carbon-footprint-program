import { z } from "zod";
import {
  EntityReferenceSchema,
  OrganizationDisplayStatusSchema,
} from "./baseSchemas.js";

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

export type OrganizationDisplayStatus = z.infer<
  typeof OrganizationDisplayStatusSchema
>;
