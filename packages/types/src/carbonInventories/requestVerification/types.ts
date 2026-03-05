import { z } from "zod";
import type { RequestVerificationParamsSchema } from "./schemas.js";

export type RequestVerificationParams = z.infer<
  typeof RequestVerificationParamsSchema
>;
