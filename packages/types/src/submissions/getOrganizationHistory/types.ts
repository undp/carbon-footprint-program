import { z } from "zod";
import { GetOrganizationHistoryParamsSchema } from "./schemas.js";

export type GetOrganizationHistoryParams = z.infer<
  typeof GetOrganizationHistoryParamsSchema
>;
