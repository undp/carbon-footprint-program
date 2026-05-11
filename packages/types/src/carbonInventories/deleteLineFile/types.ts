import { z } from "zod";
import type {
  DeleteLineFileParamsSchema,
  DeleteLineFileResponseSchema,
} from "./schemas.js";

export type DeleteLineFileParams = z.infer<typeof DeleteLineFileParamsSchema>;

export type DeleteLineFileResponse = z.infer<
  typeof DeleteLineFileResponseSchema
>;
