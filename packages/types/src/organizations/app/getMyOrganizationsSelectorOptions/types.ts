import { z } from "zod";
import { MyOrganizationsSelectorOptionsSchema } from "./schemas.js";

export type MyOrganizationsSelectorOptions = z.infer<
  typeof MyOrganizationsSelectorOptionsSchema
>;
