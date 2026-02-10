import type { z } from "zod";
import type { GetEmissionsSummaryCategoriesResponseSchema } from "./schemas.js";

export type GetEmissionsSummaryCategoriesResponse = z.infer<
  typeof GetEmissionsSummaryCategoriesResponseSchema
>;
