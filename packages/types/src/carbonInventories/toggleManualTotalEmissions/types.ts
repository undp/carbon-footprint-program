import { z } from "zod";
import type {
  ToggleManualTotalEmissionsParamsSchema,
  ToggleManualTotalEmissionsRequestSchema,
} from "./schemas.js";

export type ToggleManualTotalEmissionsRequest = z.infer<
  typeof ToggleManualTotalEmissionsRequestSchema
>;

export type ToggleManualTotalEmissionsParams = z.infer<
  typeof ToggleManualTotalEmissionsParamsSchema
>;
