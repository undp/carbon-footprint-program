import type { z } from "zod";
import type {
  GetReductionProjectAccessParamsSchema,
  GetReductionProjectAccessResponseSchema,
} from "./schemas.js";

export type GetReductionProjectAccessParams = z.infer<
  typeof GetReductionProjectAccessParamsSchema
>;

export type GetReductionProjectAccessResponse = z.infer<
  typeof GetReductionProjectAccessResponseSchema
>;
