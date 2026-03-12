import type { z } from "zod";
import type {
  GetEmissionsSummaryCategoriesParamsSchema,
  GetEmissionsSummaryCategoriesResponseSchema,
} from "./schemas.js";

export type GetEmissionsSummaryCategoriesParams = z.infer<
  typeof GetEmissionsSummaryCategoriesParamsSchema
>;

export type GetEmissionsSummaryCategoriesResponse = z.infer<
  typeof GetEmissionsSummaryCategoriesResponseSchema
>;
