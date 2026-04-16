import { z } from "zod";
import { YearQueryParamSchema, LimitQueryParamSchema } from "./schemas.js";

export type YearQueryParam = z.infer<typeof YearQueryParamSchema>;
export type LimitQueryParam = z.infer<typeof LimitQueryParamSchema>;
