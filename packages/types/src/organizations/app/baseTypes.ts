import { z } from "zod";
import type { OrganizationMutationDataSchema } from "./baseSchemas.js";
export type OrganizationMutationData = z.infer<
  typeof OrganizationMutationDataSchema
>;
