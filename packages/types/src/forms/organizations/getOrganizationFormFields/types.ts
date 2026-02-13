import { z } from "zod";
import type {
  FormFieldSchema,
  GetOrganizationFormFieldsResponseSchema,
} from "./schemas.js";

export type FormField = z.infer<typeof FormFieldSchema>;

export type GetOrganizationFormFieldsResponse = z.infer<
  typeof GetOrganizationFormFieldsResponseSchema
>;
