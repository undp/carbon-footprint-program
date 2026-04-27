import { z } from "zod";
import type {
  DeleteCountrySubsectorParamsSchema,
  DeleteCountrySubsectorResponseSchema,
} from "./schemas.js";

export type DeleteCountrySubsectorParams = z.infer<
  typeof DeleteCountrySubsectorParamsSchema
>;
export type DeleteCountrySubsectorResponse = z.infer<
  typeof DeleteCountrySubsectorResponseSchema
>;
