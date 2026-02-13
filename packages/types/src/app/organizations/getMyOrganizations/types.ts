import { z } from "zod";
import type { GetMyOrganizationsResponseSchema } from "./schemas.js";

export type GetMyOrganizationsResponse = z.infer<
  typeof GetMyOrganizationsResponseSchema
>;
