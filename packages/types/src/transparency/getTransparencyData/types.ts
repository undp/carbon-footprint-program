import { z } from "zod";
import {
  GetTransparencyDataQuerySchema,
  GetTransparencyDataResponseSchema,
} from "./schemas.js";

export type GetTransparencyDataQuery = z.infer<
  typeof GetTransparencyDataQuerySchema
>;

export type GetTransparencyDataResponse = z.infer<
  typeof GetTransparencyDataResponseSchema
>;
