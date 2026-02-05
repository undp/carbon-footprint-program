import { z } from "zod";
import type { ToggleManualTotalEmissionsRequestSchema } from "./schemas.js";

export type ToggleManualTotalEmissionsRequest = z.infer<
  typeof ToggleManualTotalEmissionsRequestSchema
>;
