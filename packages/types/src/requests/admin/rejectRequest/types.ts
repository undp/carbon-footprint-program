import { z } from "zod";
import {
  RejectRequestParamsSchema,
  RejectRequestBodySchema,
  RejectRequestResponseSchema,
} from "./schemas.js";

export type RejectRequestParams = z.infer<typeof RejectRequestParamsSchema>;
export type RejectRequestBody = z.infer<typeof RejectRequestBodySchema>;
export type RejectRequestResponse = z.infer<typeof RejectRequestResponseSchema>;
