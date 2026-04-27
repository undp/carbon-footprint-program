import { z } from "zod";
import type {
  UpdateCountrySubsectorParamsSchema,
  UpdateCountrySubsectorRequestSchema,
  UpdateCountrySubsectorResponseSchema,
} from "./schemas.js";

export type UpdateCountrySubsectorParams = z.infer<
  typeof UpdateCountrySubsectorParamsSchema
>;
export type UpdateCountrySubsectorRequest = z.infer<
  typeof UpdateCountrySubsectorRequestSchema
>;
export type UpdateCountrySubsectorResponse = z.infer<
  typeof UpdateCountrySubsectorResponseSchema
>;
