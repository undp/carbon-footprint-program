import { z } from "zod";
import {
  DeactivateBadgeParamsSchema,
  DeactivateBadgeResponseSchema,
} from "./schemas.js";

export type DeactivateBadgeParams = z.infer<typeof DeactivateBadgeParamsSchema>;
export type DeactivateBadgeResponse = z.infer<
  typeof DeactivateBadgeResponseSchema
>;
