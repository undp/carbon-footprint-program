import { z } from "zod";
import type {
  OrganizationFormFieldSchema,
  GetOrganizationFormFieldsResponseSchema,
} from "./schemas.js";

export type FormField = z.infer<typeof OrganizationFormFieldSchema>;

export type GetOrganizationFormFieldsResponse = z.infer<
  typeof GetOrganizationFormFieldsResponseSchema
>;
