import { z } from "zod";
import type { GetOrganizationsKpisResponseSchema } from "./schemas.js";

export type GetOrganizationsKpisResponse = z.infer<
  typeof GetOrganizationsKpisResponseSchema
>;
