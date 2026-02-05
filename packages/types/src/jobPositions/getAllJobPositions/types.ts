import { z } from "zod";
import type {
  GetAllJobPositionsResponseSchema,
  JobPositionSchema,
} from "./schemas.js";

export type JobPosition = z.infer<typeof JobPositionSchema>;

export type GetAllJobPositionsResponse = z.infer<
  typeof GetAllJobPositionsResponseSchema
>;
