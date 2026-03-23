import { z } from "zod";
import type { DeleteReductionProjectParamsSchema } from "./schemas.js";

export type DeleteReductionProjectParams = z.infer<
  typeof DeleteReductionProjectParamsSchema
>;
