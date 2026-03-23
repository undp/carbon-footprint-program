import { z } from "zod";
import type {
  GetAllSealApplicationsQuerySchema,
  SealApplicationSchema,
  GetAllSealApplicationsResponseSchema,
} from "./schemas.js";

export type GetAllSealApplicationsQuery = z.infer<
  typeof GetAllSealApplicationsQuerySchema
>;

export type SealApplication = z.infer<typeof SealApplicationSchema>;

export type GetAllSealApplicationsResponse = z.infer<
  typeof GetAllSealApplicationsResponseSchema
>;
