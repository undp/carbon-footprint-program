import { z } from "zod";
import type { GetAllJobPositionsResponseSchema } from "./schemas.js";

export type GetAllJobPositionsResponse = z.infer<
  typeof GetAllJobPositionsResponseSchema
>;
