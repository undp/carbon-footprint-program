import { z } from "zod";
import {
  SubmitAccreditationRequestParamsSchema,
  SubmitAccreditationRequestResponseSchema,
} from "./schemas.js";

export type SubmitAccreditationRequestParams = z.infer<
  typeof SubmitAccreditationRequestParamsSchema
>;

export type SubmitAccreditationRequestResponse = z.infer<
  typeof SubmitAccreditationRequestResponseSchema
>;
