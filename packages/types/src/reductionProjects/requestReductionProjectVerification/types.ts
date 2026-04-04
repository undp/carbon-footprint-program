import { z } from "zod";
import type {
  RequestReductionProjectVerificationBodySchema,
  RequestReductionProjectVerificationParamsSchema,
} from "./schemas.js";

export type RequestReductionProjectVerificationParams = z.infer<
  typeof RequestReductionProjectVerificationParamsSchema
>;

export type RequestReductionProjectVerificationBody = z.infer<
  typeof RequestReductionProjectVerificationBodySchema
>;
