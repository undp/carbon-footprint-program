import { z } from "zod";
import {
  EntityReferenceSchema,
  OrganizationDisplayStatusSchema,
  OrganizationMutationDataSchema,
} from "./baseSchemas.js";

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

export type OrganizationDisplayStatus = z.infer<
  typeof OrganizationDisplayStatusSchema
>;

export type OrganizationMutationData = z.infer<
  typeof OrganizationMutationDataSchema
>;
