import { z } from "zod";
import type { GetOrganizationKpisResponseSchema } from "./schemas.js";

export type GetOrganizationKpisResponse = z.infer<
  typeof GetOrganizationKpisResponseSchema
>;
