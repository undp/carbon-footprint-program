import { z } from "zod";
import {
  ActivateBadgeParamsSchema,
  ActivateBadgeResponseSchema,
} from "./schemas.js";

export type ActivateBadgeParams = z.infer<typeof ActivateBadgeParamsSchema>;
export type ActivateBadgeResponse = z.infer<typeof ActivateBadgeResponseSchema>;
