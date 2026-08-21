import { z } from "zod";
import type {
  GetAllTerritoriesQuerySchema,
  GetAllTerritoriesResponseSchema,
} from "./schemas.js";

export type GetAllTerritoriesQuery = z.infer<
  typeof GetAllTerritoriesQuerySchema
>;
export type GetAllTerritoriesResponse = z.infer<
  typeof GetAllTerritoriesResponseSchema
>;
export type Territory = GetAllTerritoriesResponse[number];
