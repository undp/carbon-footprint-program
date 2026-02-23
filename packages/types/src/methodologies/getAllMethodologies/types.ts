import { z } from "zod";
import { GetAllMethodologiesResponseSchema } from "./schemas.js";

// TypeScript Types
export type GetAllMethodologiesResponse = z.infer<
  typeof GetAllMethodologiesResponseSchema
>;
