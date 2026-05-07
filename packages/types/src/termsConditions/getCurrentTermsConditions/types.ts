import { z } from "zod";
import { GetCurrentTermsConditionsResponseSchema } from "./schemas.js";

export type GetCurrentTermsConditionsResponse = z.infer<
  typeof GetCurrentTermsConditionsResponseSchema
>;
