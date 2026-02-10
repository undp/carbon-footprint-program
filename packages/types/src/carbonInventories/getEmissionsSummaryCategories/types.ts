import type { z } from "zod";
import { GetEmissionsSummaryCategoriesResponseSchema } from "./schemas.js";

export type GetEmissionsSummaryCategoriesResponse = z.infer<
  typeof GetEmissionsSummaryCategoriesResponseSchema
>;
