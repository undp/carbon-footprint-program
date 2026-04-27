import { z } from "zod";
import type {
  RestoreCountrySubsectorParamsSchema,
  RestoreCountrySubsectorResponseSchema,
} from "./schemas.js";

export type RestoreCountrySubsectorParams = z.infer<
  typeof RestoreCountrySubsectorParamsSchema
>;
export type RestoreCountrySubsectorResponse = z.infer<
  typeof RestoreCountrySubsectorResponseSchema
>;
