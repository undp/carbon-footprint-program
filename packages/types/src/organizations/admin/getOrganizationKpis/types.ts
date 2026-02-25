import { z } from "zod";
import { GetOrganizationKpisResponseSchema } from "./schemas.js";

export type GetOrganizationKpisResponse = z.infer<
  typeof GetOrganizationKpisResponseSchema
>;
