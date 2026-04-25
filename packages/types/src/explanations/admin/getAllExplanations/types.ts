import { z } from "zod";
import type { GetAllExplanationsResponseSchema } from "./schemas.ts";

export type GetAllExplanationsResponse = z.infer<
  typeof GetAllExplanationsResponseSchema
>;
