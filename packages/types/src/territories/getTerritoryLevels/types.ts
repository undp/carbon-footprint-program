import { z } from "zod";
import type { GetTerritoryLevelsResponseSchema } from "./schemas.js";

export type GetTerritoryLevelsResponse = z.infer<
  typeof GetTerritoryLevelsResponseSchema
>;
