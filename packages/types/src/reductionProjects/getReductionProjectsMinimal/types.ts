import { z } from "zod";
import type { GetReductionProjectsMinimalResponseSchema } from "./schemas.js";

export type GetReductionProjectsMinimalResponse = z.infer<
  typeof GetReductionProjectsMinimalResponseSchema
>;
