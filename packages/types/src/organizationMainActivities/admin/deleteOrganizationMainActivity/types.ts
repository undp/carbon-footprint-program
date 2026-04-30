import { z } from "zod";
import type { DeleteOrganizationMainActivityParamsSchema } from "./schemas.js";

export type DeleteOrganizationMainActivityParams = z.infer<
  typeof DeleteOrganizationMainActivityParamsSchema
>;
