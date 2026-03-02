import { z } from "zod";
import {
  OrganizationDisplayStatusSchema,
  OrganizationMutationDataSchema,
} from "./schemas.js";

export type OrganizationDisplayStatus = z.infer<
  typeof OrganizationDisplayStatusSchema
>;

export type OrganizationMutationData = z.infer<
  typeof OrganizationMutationDataSchema
>;
