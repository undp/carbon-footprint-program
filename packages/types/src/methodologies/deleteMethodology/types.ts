import { z } from "zod";
import {
  DeleteMethodologyParamsSchema,
  DeleteMethodologyResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type DeleteMethodologyParams = z.infer<
  typeof DeleteMethodologyParamsSchema
>;
export type DeleteMethodologyResponse = z.infer<
  typeof DeleteMethodologyResponseSchema
>;
