import { z } from "zod";
import { GetMyOrganizationsSelectorOptionsResponseSchema } from "./schemas.js";

export type GetMyOrganizationsSelectorOptionsResponse = z.infer<
  typeof GetMyOrganizationsSelectorOptionsResponseSchema
>;
