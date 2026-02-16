import { z } from "zod";
import { GetMyOrganizationsResponseSchema } from "./schemas.js";

export type GetMyOrganizationsResponse = z.infer<
  typeof GetMyOrganizationsResponseSchema
>;
