import { z } from "zod";
import type { GetCurrentTermsConditionsResponseSchema } from "./schemas.js";

export type GetCurrentTermsConditionsResponse = z.infer<
  typeof GetCurrentTermsConditionsResponseSchema
>;
