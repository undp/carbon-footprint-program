import { z } from "zod";
import { OrganizationMutationDataSchema } from "./baseSchemas.js";
export type OrganizationMutationData = z.infer<
  typeof OrganizationMutationDataSchema
>;
