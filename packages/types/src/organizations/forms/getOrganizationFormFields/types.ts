import { z } from "zod";
import type { GetOrganizationFormFieldsResponseSchema } from "./schemas.js";

export type GetOrganizationFormFieldsResponse = z.infer<
  typeof GetOrganizationFormFieldsResponseSchema
>;
