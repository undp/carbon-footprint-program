import { z } from "zod";
import { MyOrganizationsSelectorOptionsResponseSchema } from "./schemas.js";

export type MyOrganizationsSelectorOptionsResponse = z.infer<
  typeof MyOrganizationsSelectorOptionsResponseSchema
>;
