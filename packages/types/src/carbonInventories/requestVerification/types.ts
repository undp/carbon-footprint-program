import { z } from "zod";
import type {
  RequestVerificationBodySchema,
  RequestVerificationParamsSchema,
} from "./schemas.js";

export type RequestVerificationParams = z.infer<
  typeof RequestVerificationParamsSchema
>;

export type RequestVerificationBody = z.infer<
  typeof RequestVerificationBodySchema
>;
