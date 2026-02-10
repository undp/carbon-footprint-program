import type { z } from "zod";
import type { GetEmissionsSummaryFullResponseSchema } from "./schemas.js";

export type GetEmissionsSummaryFullResponse = z.infer<
  typeof GetEmissionsSummaryFullResponseSchema
>;
