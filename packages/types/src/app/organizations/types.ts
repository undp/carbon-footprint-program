import { z } from "zod";
import type {
  RepresentativeSchema,
  OrganizationDetailsSchema,
  OrganizationMutationDataSchema,
} from "./schemas.js";

export type Representative = z.infer<typeof RepresentativeSchema>;

export type OrganizationDetails = z.infer<typeof OrganizationDetailsSchema>;

export type OrganizationMutationData = z.infer<
  typeof OrganizationMutationDataSchema
>;
