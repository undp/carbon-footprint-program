import { z } from "zod";
import {
  GetAdminRequestsKpisQuerySchema,
  GetAdminRequestsKpisResponseSchema,
} from "./schemas.js";

export type GetAdminRequestsKpisQuery = z.infer<
  typeof GetAdminRequestsKpisQuerySchema
>;
export type GetAdminRequestsKpisResponse = z.infer<
  typeof GetAdminRequestsKpisResponseSchema
>;
