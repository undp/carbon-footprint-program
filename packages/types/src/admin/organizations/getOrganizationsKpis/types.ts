import { z } from "zod";
import { GetOrganizationsKpisResponseSchema } from "./schemas.js";

export type GetOrganizationsKpisResponse = z.infer<
  typeof GetOrganizationsKpisResponseSchema
>;
