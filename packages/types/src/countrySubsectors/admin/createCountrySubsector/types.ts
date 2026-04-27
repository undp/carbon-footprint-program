import { z } from "zod";
import type {
  CreateCountrySubsectorRequestSchema,
  CreateCountrySubsectorResponseSchema,
} from "./schemas.js";

export type CreateCountrySubsectorRequest = z.infer<
  typeof CreateCountrySubsectorRequestSchema
>;
export type CreateCountrySubsectorResponse = z.infer<
  typeof CreateCountrySubsectorResponseSchema
>;
